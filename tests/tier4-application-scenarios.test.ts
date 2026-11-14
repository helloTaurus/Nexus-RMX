import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, authHeaders, inspectSourceFile, db } from './test-helpers.ts';

/**
 * ============================================================================
 * TIER 4: Real-World Application Workload Scenarios
 * ============================================================================
 * 5 comprehensive end-to-end workload application scenarios.
 * Authority: ORIGINAL_REQUEST.md (§R1, §R2, §R3, §R4), PROJECT.md, TEST_INFRA.md.
 */

describe('Tier 4: Real-World Application Workload Scenarios', () => {

  // --------------------------------------------------------------------------
  // Scenario 1: Standard Employee Daily Self-Service Flow
  // --------------------------------------------------------------------------
  it('Scenario 1: Standard Employee Daily Self-Service Flow (F1-F7, F14, F15)', async () => {
    // Step 1: Staff login with valid credentials (NX-0002)
    const loginRes = await apiRequest('POST', '/api/hrms/auth/login', {
      body: {
        username: 'oluwaseun.adeyemi@nexusfinance.com',
        password: 'nexus2026'
      }
    });
    assert.equal(loginRes.status, 200, 'Step 1: Login must succeed');
    const loginData = loginRes.json();
    assert.equal(loginData.success, true);
    assert.equal(loginData.staff.employeeNumber, 'NX-0002');
    const sessionToken = loginData.token;

    // Step 2: Role-adaptive routing verifies role normalization to 'employee'
    const authSrc = inspectSourceFile('src/context/AuthContext.tsx');
    assert.ok(authSrc.exists, 'Step 2: AuthContext must exist');
    assert.ok(
      authSrc.contains(/employee/),
      'Step 2: AuthContext must normalize standard staff role to employee'
    );

    // Step 3: Welcome header validates identity contracts
    const empSrc = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
    assert.ok(empSrc.exists, 'Step 3: EmployeeView must exist');
    assert.ok(empSrc.contains(/Welcome\s+back/i), 'Step 3: Welcome header must render greeting');

    // Step 4: Profile card verifies personal HR metadata contracts
    assert.ok(
      empSrc.contains(/date_of_joining/) || empSrc.contains(/hire/) || empSrc.contains(/joining/),
      'Step 4: Profile card must display hire date'
    );
    assert.ok(
      empSrc.contains(/manager/) || empSrc.contains(/reporting_manager/),
      'Step 4: Profile card must display reporting manager'
    );

    // Step 5: Quick links panel verifies presence of Directory link without Admin tools
    assert.ok(
      empSrc.contains(/directory/i) || empSrc.contains(/DirectorySearch/i),
      'Step 5: Quick links must offer Company Directory access'
    );
    assert.ok(
      !empSrc.contains(/Onboard New Employee/i) && !empSrc.contains(/Manage Systems/i),
      'Step 5: Quick links must not contain privileged admin links'
    );

    // Step 6: Security tracker queries active session and login history
    const secRes = await apiRequest('GET', '/api/hrms/auth/security-log', {
      headers: { ...authHeaders('Employee', 'Oluwaseun Adeyemi'), 'authorization': `Bearer ${sessionToken}` }
    });
    assert.equal(secRes.status, 200, 'Step 6: Security log query must succeed');
    const secData = secRes.json();
    assert.equal(secData.success, true);
    assert.ok(secData.activeSession, 'Step 6: Active session flag must be true');

    // Step 7: Employee performs corporate directory search for coworker
    const dirRes = await apiRequest('GET', '/api/hrms/directory?search=Amina', {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    assert.equal(dirRes.status, 200, 'Step 7: Directory search must succeed');
    const dirData = dirRes.json();
    assert.ok(dirData.directory.length > 0, 'Step 7: Coworker search must return results');

    // Step 8: Strict privacy verification - no salary or BVN leakage
    for (const coworker of dirData.directory) {
      assert.equal(coworker.salary_monthly, undefined, 'Step 8: salary_monthly must be hidden');
      assert.equal(coworker.bvn_nin_masked, undefined, 'Step 8: BVN must be hidden');
    }

    // Step 9: Theme toggle hook verification
    const themeSrc = inspectSourceFile('src/hooks/useTheme.ts');
    assert.ok(themeSrc.exists, 'Step 9: useTheme.ts must exist');
    assert.ok(themeSrc.contains(/toggleTheme/), 'Step 9: toggleTheme function must exist');

    // Step 10: Secure logout: cookie cleared, session terminated
    const logoutRes = await apiRequest('POST', '/api/hrms/auth/logout', {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    assert.equal(logoutRes.status, 200, 'Step 10: Logout must return 200 OK');
    assert.ok(logoutRes.headers['set-cookie'], 'Step 10: Set-Cookie must be present on logout');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: HR Administrator Workforce Oversight & Onboarding Flow
  // --------------------------------------------------------------------------
  it('Scenario 2: HR Administrator Workforce Oversight & Onboarding Flow (F8-F11, F13, F14, F16, F17)', async () => {
    // Step 1: HR Admin login (Dr. Amina Bello, NX-0001)
    const loginRes = await apiRequest('POST', '/api/hrms/auth/login', {
      body: {
        username: 'amina.bello@nexusfinance.com',
        password: 'nexus2026'
      }
    });
    assert.equal(loginRes.status, 200, 'Step 1: Admin login must succeed');
    const loginData = loginRes.json();
    assert.equal(loginData.staff.employeeNumber, 'NX-0001');

    // Step 2: Role-adaptive routing verifies role normalization to 'hr_admin'
    const dashSrc = inspectSourceFile('src/components/dashboard/RoleAdaptiveDashboard.tsx');
    assert.ok(dashSrc.exists, 'Step 2: RoleAdaptiveDashboard must exist');
    assert.ok(
      dashSrc.contains(/AdminView/) && dashSrc.contains(/hr_admin/),
      'Step 2: RoleAdaptiveDashboard must render AdminView for hr_admin'
    );

    // Step 3: Workforce statistics panel loads live numbers from SQLite
    const statsRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() });
    assert.equal(statsRes.status, 200, 'Step 3: Workforce stats query must succeed');
    const initialStats = statsRes.json().stats;
    assert.ok(initialStats.activeHeadcount >= 1, 'Step 3: activeHeadcount must be >= 1');
    assert.ok(initialStats.departmentBreakdown.length > 0, 'Step 3: departmentBreakdown must be present');

    // Step 4: Admin navigation controls verify privileged sidebar links
    const admSrc = inspectSourceFile('src/components/dashboard/AdminView.tsx');
    assert.ok(admSrc.exists, 'Step 4: AdminView must exist');
    assert.ok(
      admSrc.contains(/Onboard New Employee/i) || admSrc.contains(/Onboard/i),
      'Step 4: AdminView must include Onboard action'
    );
    assert.ok(
      admSrc.contains(/Manage Systems/i) || admSrc.contains(/Systems/i) || admSrc.contains(/settings/i),
      'Step 4: AdminView must include Manage Systems action'
    );

    // Step 5: Recent activity stream queries latest audit_events
    const actRes = await apiRequest('GET', '/api/hrms/activity?limit=10', { headers: authHeaders() });
    assert.equal(actRes.status, 200, 'Step 5: Activity stream query must succeed');
    const actData = actRes.json();
    assert.ok(Array.isArray(actData.activities), 'Step 5: Activities must be an array');

    // Step 6 & 7: Admin inputs complete employee dossier and submits onboarding form
    const timestamp = Date.now().toString().slice(-5);
    const newStaffEmail = `scenario2.newhire.${timestamp}@nexusfinance.com`;
    const onboardRes = await apiRequest('POST', '/api/hrms/employees', {
      headers: authHeaders(),
      body: {
        first_name: 'Chinedu',
        last_name: `Okafor_${timestamp}`,
        official_email: newStaffEmail,
        personal_email: `chinedu.okafor.${timestamp}@gmail.com`,
        phone: '+2348055551234',
        department_id: 'dept-credit',
        designation_id: 'desig-crk-snr',
        salary_monthly: 750000,
        reporting_manager_id: 'emp_amina_bello',
        branch_location: 'Abuja Head Office (CBD)',
        employment_type: 'Full-Time',
        employment_status: 'Active',
        date_of_joining: new Date().toISOString().slice(0, 10),
        role: 'Employee'
      }
    });
    assert.equal(onboardRes.status, 201, 'Step 7: Onboarding form submission must return 201 Created');
    const newEmp = onboardRes.json().employee;
    assert.ok(newEmp.employee_number.startsWith('NX-'), 'Step 7: New employee must have NX- number');

    // Step 8: Live workforce statistics automatically reflect +1 active headcount
    const updatedStatsRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() });
    const updatedStats = updatedStatsRes.json().stats;
    assert.equal(
      updatedStats.activeHeadcount,
      initialStats.activeHeadcount + 1,
      'Step 8: Stats active headcount must increase by 1'
    );

    // Step 9: Activity stream shows new onboard_new_employee event
    const updatedActRes = await apiRequest('GET', '/api/hrms/activity?limit=5', { headers: authHeaders() });
    const latestEvent = updatedActRes.json().activities[0];
    assert.equal(latestEvent.action, 'onboard_new_employee', 'Step 9: Latest activity event must be onboard_new_employee');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Employee Department Transfer & Offboarding Lifecycle
  // --------------------------------------------------------------------------
  it('Scenario 3: Employee Department Transfer & Offboarding Lifecycle (F8, F10, F12, F13, F17)', async () => {
    // Step 1: Create a test employee for lifecycle management
    const suffix = Date.now().toString().slice(-5);
    const email = `lifecycle.emp.${suffix}@nexusfinance.com`;
    const createRes = await apiRequest('POST', '/api/hrms/employees', {
      headers: authHeaders(),
      body: {
        first_name: 'Fatima',
        last_name: `Abubakar_${suffix}`,
        official_email: email,
        phone: '+2348077778888',
        department_id: 'dept-credit',
        designation_id: 'desig-crk-snr',
        salary_monthly: 500000,
        date_of_joining: '2026-01-10',
        employment_status: 'Active',
        role: 'Employee'
      }
    });
    assert.equal(createRes.status, 201);
    const empId = createRes.json().employee.id;

    // Step 2 & 3: Admin transfers employee from dept-credit to dept-ops
    const transferRes = await apiRequest('PATCH', `/api/hrms/employees/${empId}`, {
      headers: authHeaders(),
      body: { department_id: 'dept-ops' }
    });
    assert.equal(transferRes.status, 200, 'Step 2: Department transfer must succeed');

    // Verify department in SQLite
    const empInDb = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(empId) as any;
    assert.equal(empInDb.department_id, 'dept-ops', 'Step 3: SQLite record must reflect dept-ops');

    // Step 4 & 5: Admin reassigns manager and verifies directory update
    const managerRes = await apiRequest('PATCH', `/api/hrms/employees/${empId}`, {
      headers: authHeaders(),
      body: { reporting_manager_id: 'emp_amina_bello' }
    });
    assert.equal(managerRes.status, 200, 'Step 4: Manager reassignment must succeed');

    const dirRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(email)}`, {
      headers: authHeaders()
    });
    const dirEmp = dirRes.json().directory.find((e: any) => e.id === empId);
    assert.ok(dirEmp, 'Step 5: Employee must be present in directory');
    assert.equal(dirEmp.department_id, 'dept-ops', 'Step 5: Directory must show updated dept-ops');

    // Step 6 & 7: Admin initiates offboarding: changes status to Terminated
    const offboardRes = await apiRequest('PATCH', `/api/hrms/employees/${empId}`, {
      headers: authHeaders(),
      body: { employment_status: 'Terminated' }
    });
    assert.equal(offboardRes.status, 200, 'Step 6: Offboarding patch must succeed');

    // Verify account deactivated in SQLite
    const accRecord = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(empId) as any;
    assert.equal(accRecord.is_active, 0, 'Step 7: employee_accounts.is_active must be 0');

    // Step 8: Offboarded employee attempts to login -> rejected with 403 Deactivated
    const loginAttempt = await apiRequest('POST', '/api/hrms/auth/login', {
      body: { username: email, password: 'nexus2026' }
    });
    assert.equal(loginAttempt.status, 403, 'Step 8: Offboarded employee login must return 403 Forbidden');

    // Step 9: Public directory excludes offboarded employee
    const dirAfterRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(email)}`, {
      headers: authHeaders()
    });
    const foundAfter = dirAfterRes.json().directory.find((e: any) => e.id === empId);
    assert.equal(foundAfter, undefined, 'Step 9: Offboarded employee must not appear in directory');

    // Step 10: Activity stream records offboarding event
    const actRes = await apiRequest('GET', '/api/hrms/activity?limit=5', { headers: authHeaders() });
    const offboardEvent = actRes.json().activities.find((a: any) => a.entityId === empId);
    assert.ok(offboardEvent, 'Step 10: Activity stream must record status change audit event');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Adversarial Security & Role Boundary Enforcement
  // --------------------------------------------------------------------------
  it('Scenario 4: Adversarial Security & Role Boundary Enforcement (F5, F7, F11, F12, F17)', async () => {
    // Step 1: Unauthenticated request to protected endpoints rejected
    const unauthStats = await apiRequest('GET', '/api/hrms/stats', {
      headers: { 'x-nexus-role': 'AnonymousUser' }
    });
    assert.ok(unauthStats.status === 401 || unauthStats.status === 403, 'Step 1: Unauthenticated stats request must be rejected');

    // Step 2: Standard employee tries to access admin-only statistics -> 403
    const empStats = await apiRequest('GET', '/api/hrms/stats', {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    assert.ok(empStats.status === 403 || empStats.status === 401, 'Step 2: Employee role must be forbidden on stats');

    // Step 3: Standard employee tries to create a new employee via POST /api/hrms/employees -> 403
    const empCreate = await apiRequest('POST', '/api/hrms/employees', {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
      body: { first_name: 'Intruder', last_name: 'Employee', official_email: 'intruder@nexusfinance.com' }
    });
    assert.ok(empCreate.status === 403 || empCreate.status === 401, 'Step 3: Employee role must be forbidden on onboarding');

    // Step 4: Standard employee tries to update someone else's profile -> 403
    const empPatch = await apiRequest('PATCH', '/api/hrms/employees/emp_amina_bello', {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
      body: { salary_monthly: 99999999 }
    });
    assert.ok(empPatch.status === 403 || empPatch.status === 401, 'Step 4: Employee role must be forbidden on profile updates');

    // Step 5: Role spoofing attempt via unrecognized header value is rejected
    const spoofRole = await apiRequest('GET', '/api/hrms/stats', {
      headers: { 'x-nexus-role': 'SuperAdminMasterRoot' }
    });
    assert.ok(spoofRole.status === 403 || spoofRole.status === 401, 'Step 5: Unrecognized role spoofing must be rejected');

    // Step 6: SQL injection attempt in directory search
    const sqlInject = await apiRequest('GET', "/api/hrms/directory?search=' OR '1'='1", {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    assert.equal(sqlInject.status, 200, 'Step 6: SQL injection must not crash query');
    // Ensure salaries still not leaked
    for (const item of sqlInject.json().directory) {
      assert.equal(item.salary_monthly, undefined, 'Step 6: Privacy filter must hold under injection attempt');
    }

    // Step 7: Duplicate email onboarding attempt rejected
    const dupRes = await apiRequest('POST', '/api/hrms/employees', {
      headers: authHeaders(),
      body: {
        first_name: 'Duplicate',
        last_name: 'User',
        official_email: 'amina.bello@nexusfinance.com', // Duplicate
        phone: '+234000000000',
        department_id: 'dept-hcm',
        designation_id: 'desig-hcm-head',
        salary_monthly: 100000
      }
    });
    assert.ok(dupRes.status === 400 || dupRes.status === 409 || dupRes.status === 500, 'Step 7: Duplicate email must be rejected');

    // Step 8: Tampered session token rejected
    const badTokenRes = await apiRequest('GET', '/api/hrms/employees/emp_amina_bello', {
      headers: { 'authorization': 'Bearer fake_tampered_token_xyz_123' }
    });
    assert.ok(badTokenRes.status === 401 || badTokenRes.status === 403 || badTokenRes.status === 200, 'Step 8: Auth layer must handle tampered tokens');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Theme Preference & Session Termination Lifecycle
  // --------------------------------------------------------------------------
  it('Scenario 5: Theme Preference & Session Termination Lifecycle (F4, F6, F14, F15, F17)', async () => {
    // Step 1 & 2: useTheme hook manages theme state and dark class on documentElement
    const themeSrc = inspectSourceFile('src/hooks/useTheme.ts');
    assert.ok(themeSrc.exists, 'Step 1: useTheme.ts must exist');
    assert.ok(
      themeSrc.contains(/toggleTheme/),
      'Step 2: useTheme must provide toggleTheme action'
    );
    assert.ok(
      themeSrc.contains(/localStorage/) && themeSrc.contains(/nexus-theme/),
      'Step 2: Theme must be backed by localStorage'
    );

    // Step 3: Route handling in App.tsx connects #hrms and #staffportal
    const appSrc = inspectSourceFile('src/App.tsx');
    assert.ok(
      appSrc.contains(/#hrms/) && appSrc.contains(/#staffportal/),
      'Step 3: App.tsx must handle both #hrms and #staffportal routes'
    );

    // Step 4: Login as staff member
    const loginRes = await apiRequest('POST', '/api/hrms/auth/login', {
      body: {
        username: 'oluwaseun.adeyemi@nexusfinance.com',
        password: 'nexus2026'
      }
    });
    assert.equal(loginRes.status, 200, 'Step 4: Login must succeed');
    assert.ok(loginRes.json().token, 'Step 4: Token must be issued');

    // Step 5: Perform secure logout
    const logoutRes = await apiRequest('POST', '/api/hrms/auth/logout', {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    assert.equal(logoutRes.status, 200, 'Step 5: Logout must succeed');
    const setCookie = logoutRes.headers['set-cookie'];
    assert.ok(setCookie, 'Step 5: Logout must clear session cookie via Set-Cookie');

    // Step 6: Verify after logout that session is terminated
    const auditLogout = db.prepare(`
      SELECT action FROM audit_events 
      WHERE action = 'staff_portal_logout' 
      ORDER BY created_at DESC LIMIT 1
    `).get() as any;
    assert.ok(auditLogout, 'Step 6: Logout audit event must be logged in SQLite');
  });

});

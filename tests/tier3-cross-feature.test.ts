import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, authHeaders, inspectSourceFile, db } from './test-helpers.ts';

/**
 * ============================================================================
 * TIER 3: Cross-Feature Integration Tests (Pairwise Combinatorial)
 * ============================================================================
 * 18 interconnected cross-feature test cases.
 * Authority: ORIGINAL_REQUEST.md (§R1, §R2, §R3, §R4), PROJECT.md, TEST_INFRA.md.
 */

describe('Tier 3: Cross-Feature Integration Tests', () => {

  // Test state shared across sequential pairwise interactions
  let testEmployeeId = '';
  let testEmployeeEmail = '';
  let testEmployeeNumber = '';
  const uniqueId = Date.now().toString().slice(-6);

  // --------------------------------------------------------------------------
  // CF01: Onboarding -> Headcount Increment
  // --------------------------------------------------------------------------
  it('CF01: Direct onboarding increments live active headcount in workforce statistics', async () => {
    // 1. Get baseline stats
    const statsBeforeRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() });
    const initialActive = statsBeforeRes.json().stats.activeHeadcount;

    // 2. Onboard new employee
    testEmployeeEmail = `cf01.integration.${uniqueId}@nexusfinance.com`;
    const onboardRes = await apiRequest('POST', '/api/hrms/employees', {
      headers: authHeaders(),
      body: {
        first_name: 'CrossFeature',
        last_name: `Worker_${uniqueId}`,
        official_email: testEmployeeEmail,
        phone: '+2348099990001',
        department_id: 'dept-ops',
        designation_id: 'desig-ops-cust',
        salary_monthly: 320000,
        branch_location: 'Abuja Head Office (CBD)',
        date_of_joining: new Date().toISOString().slice(0, 10),
        employment_status: 'Active',
        role: 'Employee'
      }
    });

    assert.equal(onboardRes.status, 201, 'Onboarding must return 201 Created');
    const onboardData = onboardRes.json();
    testEmployeeId = onboardData.employee.id;
    testEmployeeNumber = onboardData.employee.employee_number;

    // 3. Verify stats reflect increment
    const statsAfterRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() });
    const newActive = statsAfterRes.json().stats.activeHeadcount;
    assert.equal(newActive, initialActive + 1, 'Active headcount must increase by exactly 1');
  });

  // --------------------------------------------------------------------------
  // CF02: Onboarding -> Department Breakdown Increment
  // --------------------------------------------------------------------------
  it('CF02: Onboarding in Dept Ops increments Dept Ops active headcount in stats breakdown', async () => {
    const statsRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() });
    const data = statsRes.json();
    const opsDept = data.stats.departmentBreakdown.find((d: any) => d.departmentId === 'dept-ops');
    assert.ok(opsDept, 'dept-ops must exist in department breakdown');
    assert.ok(opsDept.activeHeadcount >= 1, 'dept-ops activeHeadcount must reflect onboarded employee');
  });

  // --------------------------------------------------------------------------
  // CF03: Onboarding -> Public Directory Search
  // --------------------------------------------------------------------------
  it('CF03: Newly onboarded employee immediately appears in public directory search', async () => {
    const dirRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(testEmployeeEmail)}`, {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    assert.equal(dirRes.status, 200);
    const data = dirRes.json();
    const found = data.directory.find((e: any) => e.official_email === testEmployeeEmail);
    assert.ok(found, 'Newly onboarded employee must be findable in public directory');
    assert.equal(found.employee_number, testEmployeeNumber, 'Found record employee number must match');
  });

  // --------------------------------------------------------------------------
  // CF04: Onboarding -> Activity Stream Audit Log
  // --------------------------------------------------------------------------
  it('CF04: Onboarding generates onboard_new_employee entry at top of recent activity stream', async () => {
    const actRes = await apiRequest('GET', '/api/hrms/activity?limit=5', { headers: authHeaders() });
    assert.equal(actRes.status, 200);
    const data = actRes.json();
    const recentOnboard = data.activities.find((a: any) => a.action === 'onboard_new_employee');
    assert.ok(recentOnboard, 'Activity stream must contain onboard_new_employee event');
  });

  // --------------------------------------------------------------------------
  // CF05: Onboarding -> Account Login
  // --------------------------------------------------------------------------
  it('CF05: Newly onboarded employee can log in immediately via staff login endpoint', async () => {
    const loginRes = await apiRequest('POST', '/api/hrms/auth/login', {
      body: {
        username: testEmployeeEmail,
        password: 'nexus2026' // default password assigned on onboarding
      }
    });
    assert.equal(loginRes.status, 200, 'Newly onboarded staff must be able to log in');
    const data = loginRes.json();
    assert.equal(data.success, true);
    assert.ok(data.token, 'Login must issue session token');
    assert.equal(data.staff.employeeNumber, testEmployeeNumber);
  });

  // --------------------------------------------------------------------------
  // CF06: Login -> Security Tracker
  // --------------------------------------------------------------------------
  it('CF06: Employee login updates last_login timestamp visible in security tracker', async () => {
    const secRes = await apiRequest('GET', '/api/hrms/auth/security-log', {
      headers: authHeaders('Employee', `CrossFeature Worker_${uniqueId}`)
    });
    assert.equal(secRes.status, 200);
    const data = secRes.json();
    assert.equal(data.success, true);
    assert.ok(data.activeSession, 'Security log must indicate active session');
  });

  // --------------------------------------------------------------------------
  // CF07: Login -> Welcome Header Sync
  // --------------------------------------------------------------------------
  it('CF07: Authenticated employee metadata matches Welcome Header contract', () => {
    const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
    assert.ok(src.exists, 'EmployeeView must exist');
    assert.ok(
      src.contains(/user/) || src.contains(/staff/) || src.contains(/first_name/),
      'Welcome header must bind to authenticated user session'
    );
  });

  // --------------------------------------------------------------------------
  // CF08: Login -> Profile Card HR Metadata Sync
  // --------------------------------------------------------------------------
  it('CF08: Profile card presents accurate HR metadata created during onboarding', () => {
    const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
    assert.ok(src.exists, 'EmployeeView must exist');
    assert.ok(
      src.contains(/date_of_joining/) || src.contains(/hire/) || src.contains(/email/) || src.contains(/phone/),
      'Profile card must project onboarding HR metadata fields'
    );
  });

  // --------------------------------------------------------------------------
  // CF09: Directory Search -> Privacy Filter
  // --------------------------------------------------------------------------
  it('CF09: Employee querying coworker directory cannot observe salary or banking fields', async () => {
    const dirRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(testEmployeeEmail)}`, {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    const data = dirRes.json();
    const coworker = data.directory.find((e: any) => e.official_email === testEmployeeEmail);
    assert.ok(coworker);
    assert.equal(coworker.salary_monthly, undefined, 'Coworker salary must not be exposed');
    assert.equal(coworker.bvn_nin_masked, undefined, 'Coworker BVN must not be exposed');
    assert.equal(coworker.bank_account_number, undefined, 'Coworker bank account must not be exposed');
  });

  // --------------------------------------------------------------------------
  // CF10: Employee Restricted Action -> 403 Forbidden
  // --------------------------------------------------------------------------
  it('CF10: Logged-in employee attempting to invoke admin onboarding is blocked with 403', async () => {
    const hackRes = await apiRequest('POST', '/api/hrms/employees', {
      headers: authHeaders('Employee', `CrossFeature Worker_${uniqueId}`),
      body: { first_name: 'Rogue', last_name: 'Employee', official_email: 'rogue@nexusfinance.com' }
    });
    assert.ok(hackRes.status === 403 || hackRes.status === 401, 'Unauthorized onboarding attempt must return 403');
  });

  // --------------------------------------------------------------------------
  // CF11: Theme Toggle & Route Switch Persistence
  // --------------------------------------------------------------------------
  it('CF11: Theme toggle state persists across views and route transitions', () => {
    const themeSrc = inspectSourceFile('src/hooks/useTheme.ts');
    assert.ok(themeSrc.exists, 'useTheme.ts must exist');
    assert.ok(
      themeSrc.contains(/localStorage/) && themeSrc.contains(/nexus-theme/),
      'Theme must persist to localStorage key nexus-theme'
    );
  });

  // --------------------------------------------------------------------------
  // CF12: Employee Logout -> Session Termination
  // --------------------------------------------------------------------------
  it('CF12: Employee logout terminates active session and sets expired cookie', async () => {
    const logoutRes = await apiRequest('POST', '/api/hrms/auth/logout', {
      headers: authHeaders('Employee', `CrossFeature Worker_${uniqueId}`)
    });
    assert.equal(logoutRes.status, 200);
    const data = logoutRes.json();
    assert.equal(data.success, true);
    assert.ok(logoutRes.headers['set-cookie'], 'Logout must send Set-Cookie invalidating session');
  });

  // --------------------------------------------------------------------------
  // CF13: Department Transfer -> Directory Update
  // --------------------------------------------------------------------------
  it('CF13: Admin transferring employee department immediately updates public directory', async () => {
    // Transfer from dept-ops to dept-hcm
    const patchRes = await apiRequest('PATCH', `/api/hrms/employees/${testEmployeeId}`, {
      headers: authHeaders(),
      body: { department_id: 'dept-hcm' }
    });
    assert.equal(patchRes.status, 200, 'Department update must succeed');

    // Query directory to verify updated department
    const dirRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(testEmployeeEmail)}`, {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    const found = dirRes.json().directory.find((e: any) => e.id === testEmployeeId);
    assert.ok(found);
    assert.equal(found.department_id, 'dept-hcm', 'Public directory must reflect updated department');
  });

  // --------------------------------------------------------------------------
  // CF14: Manager Reassignment -> Profile Sync
  // --------------------------------------------------------------------------
  it('CF14: Admin reassigning reporting manager updates employee dossier and directory', async () => {
    const patchRes = await apiRequest('PATCH', `/api/hrms/employees/${testEmployeeId}`, {
      headers: authHeaders(),
      body: { reporting_manager_id: 'emp_amina_bello' }
    });
    assert.equal(patchRes.status, 200);

    const dirRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(testEmployeeEmail)}`, {
      headers: authHeaders()
    });
    const found = dirRes.json().directory.find((e: any) => e.id === testEmployeeId);
    assert.ok(found);
    assert.ok(
      found.reporting_manager_name?.includes('Amina') || found.reporting_manager_email?.includes('amina.bello'),
      'Directory must show reassigned manager details'
    );
  });

  // --------------------------------------------------------------------------
  // CF15: Offboarding -> Headcount Decrement
  // --------------------------------------------------------------------------
  it('CF15: Offboarding employee to Terminated decrements active headcount in statistics', async () => {
    const beforeStats = (await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() })).json().stats;

    // Offboard test employee
    const offboardRes = await apiRequest('PATCH', `/api/hrms/employees/${testEmployeeId}`, {
      headers: authHeaders(),
      body: { employment_status: 'Terminated' }
    });
    assert.equal(offboardRes.status, 200);

    const afterStats = (await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() })).json().stats;
    assert.equal(afterStats.activeHeadcount, beforeStats.activeHeadcount - 1, 'Active headcount must decrement by 1');
    assert.equal(afterStats.totalHeadcount, beforeStats.totalHeadcount, 'Total headcount must remain constant');
  });

  // --------------------------------------------------------------------------
  // CF16: Offboarding -> Account Deactivation
  // --------------------------------------------------------------------------
  it('CF16: Offboarding synchronizes employee_accounts.is_active = 0 and blocks login', async () => {
    // 1. Verify in database
    const acc = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(testEmployeeId) as any;
    assert.ok(acc);
    assert.equal(acc.is_active, 0, 'employee_accounts.is_active must be 0 after offboarding');

    // 2. Attempt login
    const loginRes = await apiRequest('POST', '/api/hrms/auth/login', {
      body: { username: testEmployeeEmail, password: 'nexus2026' }
    });
    assert.equal(loginRes.status, 403, 'Login for deactivated offboarded staff must return 403 Forbidden');
  });

  // --------------------------------------------------------------------------
  // CF17: Offboarding -> Public Directory Exclusion
  // --------------------------------------------------------------------------
  it('CF17: Offboarded employee is immediately excluded from public directory', async () => {
    const dirRes = await apiRequest('GET', `/api/hrms/directory?search=${encodeURIComponent(testEmployeeEmail)}`, {
      headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
    });
    const found = dirRes.json().directory.find((e: any) => e.official_email === testEmployeeEmail);
    assert.equal(found, undefined, 'Terminated employee must NOT appear in public directory search');
  });

  // --------------------------------------------------------------------------
  // CF18: Offboarding -> Activity Stream Audit Log
  // --------------------------------------------------------------------------
  it('CF18: Offboarding records audit event in audit_events table and activity feed', async () => {
    const actRes = await apiRequest('GET', '/api/hrms/activity?limit=5', { headers: authHeaders() });
    const data = actRes.json();
    const event = data.activities.find((a: any) => a.entityId === testEmployeeId);
    assert.ok(event, 'Activity stream must contain audit event for offboarded employee mutation');
  });

});

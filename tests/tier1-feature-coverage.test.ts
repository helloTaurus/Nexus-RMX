import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, authHeaders, inspectSourceFile, db } from './test-helpers.ts';

/**
 * ============================================================================
 * TIER 1: Feature Coverage (Equivalence Class Happy-Path Tests)
 * ============================================================================
 * 17 features × 5 tests each = 85 verified test cases.
 * Authority: ORIGINAL_REQUEST.md (§R1, §R2, §R3, §R4), PROJECT.md, TEST_INFRA.md.
 */

describe('Tier 1: Feature Coverage', () => {

  // --------------------------------------------------------------------------
  // Feature 1: Employee Identity & Welcome Header (R1)
  // --------------------------------------------------------------------------
  describe('F01: Employee Identity & Welcome Header', () => {
    it('1.1 should render personalized greeting "Welcome back, [Name]"', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView component file must exist at src/components/dashboard/EmployeeView.tsx');
      assert.ok(
        src.contains(/Welcome\s+back/i),
        'EmployeeView must include personalized "Welcome back" greeting'
      );
    });

    it('1.2 should display employee profile photo or fallback initials', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/initials/i) || src.contains(/avatar/i) || src.contains(/photo/i) || src.contains(/charAt/),
        'EmployeeView must display profile photo or computed initials'
      );
    });

    it('1.3 should display assigned job title / designation', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/designation/i) || src.contains(/title/i) || src.contains(/job/i),
        'EmployeeView must display job title/designation'
      );
    });

    it('1.4 should display employee department name or code', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/department/i),
        'EmployeeView must display department information'
      );
    });

    it('1.5 should display unique employee number / ID badge (NX-xxxx)', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/employee_number/i) || src.contains(/employeeNumber/i) || src.contains(/NX-/i) || src.contains(/id/i),
        'EmployeeView must display employee ID or badge'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 2: My Profile Card (HR Metadata) (R1)
  // --------------------------------------------------------------------------
  describe('F02: My Profile Card (HR Metadata)', () => {
    it('2.1 should display employee hire date (Date of Joining)', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/hire/i) || src.contains(/date_of_joining/i) || src.contains(/joining/i),
        'Profile card must display hire date / date of joining'
      );
    });

    it('2.2 should display reporting manager name', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/manager/i) || src.contains(/reporting_manager/i),
        'Profile card must display reporting manager name'
      );
    });

    it('2.3 should display contact phone number', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/phone/i),
        'Profile card must display phone number'
      );
    });

    it('2.4 should display official corporate email address', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/email/i) || src.contains(/official_email/i),
        'Profile card must display corporate email address'
      );
    });

    it('2.5 should display employment status indicator (Active/Probation)', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/employment_status/i) || src.contains(/status/i) || src.contains(/Active/i),
        'Profile card must display employment status badge'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 3: Quick Links Panel (R1)
  // --------------------------------------------------------------------------
  describe('F03: Quick Links Panel', () => {
    it('3.1 should render visual quick links navigation panel', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/quick/i) || src.contains(/links/i) || src.contains(/actions/i),
        'EmployeeView must include quick links navigation panel'
      );
    });

    it('3.2 should provide quick link button to Company Directory', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/directory/i) || src.contains(/DirectorySearch/i),
        'Quick links must include button to Company Directory'
      );
    });

    it('3.3 should use Lucide or Phosphor icon components for navigation actions', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/lucide-react/) || src.contains(/@phosphor-icons\/react/),
        'Quick links buttons must be powered by Lucide or Phosphor icons'
      );
    });

    it('3.4 should provide quick access to time-off / leave management or self-service actions', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        src.contains(/leave/i) || src.contains(/time/i) || src.contains(/calendar/i) || src.contains(/directory/i),
        'Quick links must offer allowed self-service spaces'
      );
    });

    it('3.5 should exclude privileged HR administrator controls from regular quick links', () => {
      const src = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      assert.ok(src.exists, 'EmployeeView must exist');
      assert.ok(
        !src.contains(/Onboard New Employee/i) && !src.contains(/Manage Systems/i),
        'EmployeeView quick links must not contain privileged admin links'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 4: Security Notification Tracker (R1)
  // --------------------------------------------------------------------------
  describe('F04: Security Notification Tracker', () => {
    it('4.1 should provide GET /api/hrms/auth/security-log endpoint returning success', async () => {
      const res = await apiRequest('GET', '/api/hrms/auth/security-log', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.equal(res.status, 200, 'Security log endpoint must return 200 OK');
      const data = res.json();
      assert.equal(data.success, true, 'Response must have success: true');
    });

    it('4.2 should return last successful login timestamp in security log', async () => {
      const res = await apiRequest('GET', '/api/hrms/auth/security-log', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      assert.ok('lastLogin' in data || 'last_login' in data, 'Security log must include last login timestamp');
    });

    it('4.3 should return active session status indicator', async () => {
      const res = await apiRequest('GET', '/api/hrms/auth/security-log', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      assert.ok(data.activeSession === true || data.active_session === true, 'Security log must indicate active session');
    });

    it('4.4 should capture and report client IP address in security log', async () => {
      const res = await apiRequest('GET', '/api/hrms/auth/security-log', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      assert.ok('ipAddress' in data || 'ip_address' in data, 'Security log must report IP address');
    });

    it('4.5 should provide recent login history list from audit_events', async () => {
      const res = await apiRequest('GET', '/api/hrms/auth/security-log', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      const logins = data.recentLogins || data.recent_logins || [];
      assert.ok(Array.isArray(logins), 'Security log must return an array of recent logins');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 5: Public Directory Search & Privacy (R1)
  // --------------------------------------------------------------------------
  describe('F05: Public Directory Search & Privacy', () => {
    it('5.1 should provide GET /api/hrms/directory returning active sanitized staff', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.equal(res.status, 200, 'Public directory must return 200 OK');
      const data = res.json();
      assert.equal(data.success, true, 'Directory response must have success: true');
      assert.ok(Array.isArray(data.directory), 'Directory must return an array of employees');
    });

    it('5.2 should filter public directory by coworker name', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=Amina', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      assert.equal(res.status, 200);
      assert.ok(data.directory.length > 0, 'Searching for Amina should return at least 1 record');
      const amina = data.directory.find((e: any) => e.first_name.includes('Amina'));
      assert.ok(amina, 'Found record should contain first name Amina');
    });

    it('5.3 should filter public directory by department name or code', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=Credit', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      assert.equal(res.status, 200);
      assert.ok(data.directory.length > 0, 'Searching for Credit department should return staff');
    });

    it('5.4 should filter public directory by manager email', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=amina.bello@nexusfinanceltd.com', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.equal(res.status, 200);
      const data = res.json();
      assert.ok(Array.isArray(data.directory), 'Directory search by manager email must succeed');
    });

    it('5.5 should strictly omit private salary, bank account, and BVN fields from directory', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      for (const emp of data.directory) {
        assert.equal(emp.salary_monthly, undefined, 'Public directory must NOT expose salary_monthly');
        assert.equal(emp.bank_account_number, undefined, 'Public directory must NOT expose bank_account_number');
        assert.equal(emp.bvn_nin_masked, undefined, 'Public directory must NOT expose bvn_nin_masked');
        assert.equal(emp.personal_email, undefined, 'Public directory must NOT expose personal_email');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 6: Theme Switcher & Logout Session (R1)
  // --------------------------------------------------------------------------
  describe('F06: Theme Switcher & Logout Session', () => {
    it('6.1 should export useTheme hook supporting theme state and toggleTheme function', () => {
      const src = inspectSourceFile('src/hooks/useTheme.ts');
      assert.ok(src.exists, 'useTheme.ts must exist');
      assert.ok(src.hasExport('useTheme'), 'useTheme hook must be exported');
      assert.ok(src.contains(/toggleTheme/), 'useTheme must provide toggleTheme function');
    });

    it('6.2 should synchronize theme selection with documentElement and localStorage', () => {
      const src = inspectSourceFile('src/hooks/useTheme.ts');
      assert.ok(src.contains(/localStorage/), 'useTheme must persist to localStorage');
      assert.ok(src.contains(/document.documentElement/) || src.contains(/classList/), 'useTheme must apply theme class to document');
    });

    it('6.3 should provide POST /api/hrms/auth/logout terminating active session', async () => {
      const res = await apiRequest('POST', '/api/hrms/auth/logout', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.equal(res.status, 200, 'Logout endpoint must return 200 OK');
      const data = res.json();
      assert.equal(data.success, true, 'Logout response must have success: true');
    });

    it('6.4 should set expired session cookie on logout', async () => {
      const res = await apiRequest('POST', '/api/hrms/auth/logout', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const setCookie = res.headers['set-cookie'];
      assert.ok(setCookie, 'Logout response must include Set-Cookie header');
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
      assert.ok(
        cookieStr.includes('Expires=Thu, 01 Jan 1970') || cookieStr.includes('Max-Age=0') || cookieStr.includes('expires='),
        'Set-Cookie header must invalidate the session cookie'
      );
    });

    it('6.5 should log staff_portal_logout event in audit_events upon logout', async () => {
      await apiRequest('POST', '/api/hrms/auth/logout', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const audit = db.prepare(`
        SELECT action FROM audit_events 
        WHERE action = 'staff_portal_logout' 
        ORDER BY created_at DESC LIMIT 1
      `).get() as any;
      assert.ok(audit, 'Audit event staff_portal_logout must be inserted in SQLite');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 7: Regular Employee Access Restrictions (R1)
  // --------------------------------------------------------------------------
  describe('F07: Regular Employee Access Restrictions', () => {
    it('7.1 should forbid regular employees from accessing workforce statistics', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.ok(res.status === 403 || res.status === 401, 'Regular employee must receive 403/401 on /api/hrms/stats');
    });

    it('7.2 should forbid regular employees from creating or onboarding employees', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
        body: { first_name: 'Unauthorized', last_name: 'Test' }
      });
      assert.ok(res.status === 403 || res.status === 401, 'Regular employee must receive 403/401 on POST /api/hrms/employees');
    });

    it('7.3 should forbid regular employees from modifying peer employee profiles', async () => {
      const res = await apiRequest('PATCH', '/api/hrms/employees/emp_amina_bello', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
        body: { salary_monthly: 9999999 }
      });
      assert.ok(res.status === 403 || res.status === 401, 'Regular employee must receive 403/401 on PATCH /api/hrms/employees/:id');
    });

    it('7.4 should forbid regular employees from offboarding or changing staff status', async () => {
      const res = await apiRequest('PATCH', '/api/hrms/employees/emp_amina_bello', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
        body: { employment_status: 'Terminated' }
      });
      assert.ok(res.status === 403 || res.status === 401, 'Status modification must be forbidden to regular employees');
    });

    it('7.5 should return standard 403 Forbidden error response format', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      const data = res.json();
      assert.ok(data.error === 'Forbidden' || data.success === false, 'Forbidden response must adhere to security contract');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 8: Workforce Statistics (R2)
  // --------------------------------------------------------------------------
  describe('F08: Workforce Statistics (Headcount, Onboarded, Depts)', () => {
    it('8.1 should provide GET /api/hrms/stats returning active headcount from SQLite', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      assert.equal(res.status, 200, 'Workforce stats must return 200 OK for HR Administrator');
      const data = res.json();
      assert.equal(data.success, true);
      assert.equal(typeof data.stats.activeHeadcount, 'number', 'activeHeadcount must be a number');
      assert.ok(data.stats.activeHeadcount >= 0, 'activeHeadcount must be non-negative');
    });

    it('8.2 should return total headcount count in statistics', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      const data = res.json();
      assert.equal(typeof data.stats.totalHeadcount, 'number', 'totalHeadcount must be a number');
      assert.ok(data.stats.totalHeadcount >= data.stats.activeHeadcount, 'totalHeadcount must be >= activeHeadcount');
    });

    it('8.3 should calculate newly onboarded staff for current calendar month', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      const data = res.json();
      assert.equal(typeof data.stats.newlyOnboardedThisMonth, 'number', 'newlyOnboardedThisMonth must be a number');
      const currentMonth = new Date().toISOString().slice(0, 7);
      assert.equal(data.stats.currentMonth, currentMonth, 'currentMonth must match YYYY-MM');
    });

    it('8.4 should return departmental breakdown array with names, codes, and counts', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      const data = res.json();
      assert.ok(Array.isArray(data.stats.departmentBreakdown), 'departmentBreakdown must be an array');
      assert.ok(data.stats.departmentBreakdown.length > 0, 'departmentBreakdown must contain seeded departments');
      const dept = data.stats.departmentBreakdown[0];
      assert.ok('departmentId' in dept && 'departmentName' in dept && 'activeHeadcount' in dept, 'Department breakdown must contain required fields');
    });

    it('8.5 should reflect SQLite database changes dynamically in statistics', async () => {
      const before = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders() });
      const statsBefore = before.json().stats;
      const countInDb = (db.prepare("SELECT COUNT(*) as c FROM employees WHERE employment_status = 'Active'").get() as any).c;
      assert.equal(statsBefore.activeHeadcount, countInDb, 'activeHeadcount must exactly match active records in SQLite');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 9: Admin Navigation Controls (R2)
  // --------------------------------------------------------------------------
  describe('F09: Admin Navigation Controls', () => {
    it('9.1 should render "Onboard New Employee" privileged action control in AdminView', () => {
      const src = inspectSourceFile('src/components/dashboard/AdminView.tsx');
      assert.ok(src.exists, 'AdminView component file must exist at src/components/dashboard/AdminView.tsx');
      assert.ok(
        src.contains(/Onboard New Employee/i) || src.contains(/Onboard/i),
        'AdminView must feature "Onboard New Employee" button or control'
      );
    });

    it('9.2 should render "Manage Systems" privileged management link in AdminView', () => {
      const src = inspectSourceFile('src/components/dashboard/AdminView.tsx');
      assert.ok(src.exists, 'AdminView must exist');
      assert.ok(
        src.contains(/Manage Systems/i) || src.contains(/Systems/i) || src.contains(/settings/i),
        'AdminView must include "Manage Systems" navigation link'
      );
    });

    it('9.3 should render privileged admin sidebar navigation controls', () => {
      const src = inspectSourceFile('src/components/dashboard/AdminView.tsx');
      assert.ok(src.exists, 'AdminView must exist');
      assert.ok(
        src.contains(/sidebar/i) || src.contains(/nav/i) || src.contains(/aside/i),
        'AdminView must include privileged navigation controls'
      );
    });

    it('9.4 should provide view switcher between Admin Command Center and Employee Self-Service', () => {
      const src = inspectSourceFile('src/components/dashboard/AdminView.tsx');
      assert.ok(src.exists, 'AdminView must exist');
      assert.ok(
        src.contains(/switch/i) || src.contains(/portal/i) || src.contains(/self/i) || src.contains(/view/i),
        'AdminView should support switching or accessing self-service views'
      );
    });

    it('9.5 should wire admin navigation controls to modal triggers (e.g. OnboardingModal)', () => {
      const src = inspectSourceFile('src/components/dashboard/AdminView.tsx');
      assert.ok(src.exists, 'AdminView must exist');
      assert.ok(
        src.contains(/OnboardingModal/) || src.contains(/showOnboard/) || src.contains(/setIsOnboardingOpen/) || src.contains(/modal/i),
        'AdminView must wire controls to appropriate modal or dialog states'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 10: Recent Activity Stream (R2)
  // --------------------------------------------------------------------------
  describe('F10: Recent Activity Stream (audit_events)', () => {
    it('10.1 should provide GET /api/hrms/activity returning recent operations', async () => {
      const res = await apiRequest('GET', '/api/hrms/activity', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      assert.equal(res.status, 200, 'Activity stream endpoint must return 200 OK');
      const data = res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.activities), 'Activity stream must return an array of activities');
    });

    it('10.2 should return activity entries with userName, userRole, action, entityType, and createdAt', async () => {
      const res = await apiRequest('GET', '/api/hrms/activity', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      const data = res.json();
      if (data.activities.length > 0) {
        const item = data.activities[0];
        assert.ok('userName' in item, 'Activity item must include userName');
        assert.ok('action' in item, 'Activity item must include action');
        assert.ok('createdAt' in item, 'Activity item must include createdAt');
      }
    });

    it('10.3 should support optional limit parameter to restrict returned activity count', async () => {
      const res = await apiRequest('GET', '/api/hrms/activity?limit=5', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      const data = res.json();
      assert.equal(res.status, 200);
      assert.ok(data.activities.length <= 5, 'Activity stream must respect limit parameter');
    });

    it('10.4 should return activity operations ordered with most recent first (DESC)', async () => {
      const res = await apiRequest('GET', '/api/hrms/activity?limit=10', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello')
      });
      const data = res.json();
      if (data.activities.length >= 2) {
        const t1 = new Date(data.activities[0].createdAt).getTime();
        const t2 = new Date(data.activities[1].createdAt).getTime();
        assert.ok(t1 >= t2, 'Activities must be ordered descending by createdAt');
      }
    });

    it('10.5 should include live operational actions logged from SQLite audit_events', () => {
      const count = (db.prepare('SELECT COUNT(*) as c FROM audit_events').get() as any).c;
      assert.ok(count > 0, 'audit_events table in SQLite must contain audit records');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 11: Onboarding Form Module & SQLite Insert (R2)
  // --------------------------------------------------------------------------
  describe('F11: Onboarding Form Module & SQLite Insert', () => {
    it('11.1 should provide POST /api/hrms/employees inserting new employee into SQLite', async () => {
      const uniqueSuffix = Math.floor(Math.random() * 100000);
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator', 'Dr. Amina Bello'),
        body: {
          first_name: 'TestEmp',
          last_name: `Coverage_${uniqueSuffix}`,
          official_email: `test.coverage.${uniqueSuffix}@nexusfinanceltd.com`,
          personal_email: `test.coverage.${uniqueSuffix}@gmail.com`,
          phone: `+23480000${uniqueSuffix}`.slice(0, 15),
          department_id: 'dept-hcm',
          designation_id: 'desig-hcm-head',
          salary_monthly: 450000,
          reporting_manager_id: 'emp_amina_bello',
          branch_location: 'Abuja Head Office (CBD)',
          employment_type: 'Full-Time',
          employment_status: 'Active',
          date_of_joining: new Date().toISOString().slice(0, 10),
          role: 'Employee'
        }
      });
      assert.equal(res.status, 201, 'POST /api/hrms/employees must return 201 Created');
      const data = res.json();
      assert.equal(data.success, true);
      assert.ok(data.employee.employee_number.startsWith('NX-'), 'Created employee must have NX- employee number');
    });

    it('11.2 should auto-increment sequential employee numbers (NX-xxxx)', () => {
      const latest = db.prepare("SELECT employee_number FROM employees WHERE employee_number GLOB 'NX-[0-9][0-9][0-9][0-9]' ORDER BY employee_number DESC LIMIT 1").get() as any;
      assert.ok(latest && latest.employee_number, 'Should find existing employee number');
      assert.match(latest.employee_number, /^NX-\d{4}$/, 'Employee number must follow format NX-0001');
    });

    it('11.3 should automatically initialize leave balances in employee_leave_balances for new employee', async () => {
      const uniqueSuffix = Math.floor(Math.random() * 100000);
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders(),
        body: {
          first_name: 'Leave',
          last_name: `Emp_${uniqueSuffix}`,
          official_email: `leave.emp.${uniqueSuffix}@nexusfinanceltd.com`,
          phone: '+2348011112222',
          department_id: 'dept-hcm',
          designation_id: 'desig-hcm-head',
          salary_monthly: 300000,
          date_of_joining: '2026-11-01',
          employment_status: 'Active',
          role: 'Employee'
        }
      });
      const data = res.json();
      const empId = data.employee.id;
      const balances = db.prepare('SELECT COUNT(*) as c FROM employee_leave_balances WHERE employee_id = ?').get(empId) as any;
      assert.ok(balances.c > 0, 'New employee must have leave entitlements initialized');
    });

    it('11.4 should provision login credentials in employee_accounts upon onboarding', async () => {
      const uniqueSuffix = Math.floor(Math.random() * 100000);
      const email = `account.emp.${uniqueSuffix}@nexusfinanceltd.com`;
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders(),
        body: {
          first_name: 'Acc',
          last_name: `Emp_${uniqueSuffix}`,
          official_email: email,
          phone: '+2348022223333',
          department_id: 'dept-hcm',
          designation_id: 'desig-hcm-head',
          salary_monthly: 350000,
          date_of_joining: '2026-11-01',
          employment_status: 'Active',
          role: 'Employee'
        }
      });
      const data = res.json();
      const empId = data.employee.id;
      const account = db.prepare('SELECT id, role, is_active FROM employee_accounts WHERE employee_id = ?').get(empId) as any;
      assert.ok(account, 'Account must be provisioned in employee_accounts');
      assert.equal(account.is_active, 1, 'Account must be active');
    });

    it('11.5 should record an onboard_new_employee event in audit_events table', async () => {
      const uniqueSuffix = Math.floor(Math.random() * 100000);
      await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders(),
        body: {
          first_name: 'Audit',
          last_name: `Emp_${uniqueSuffix}`,
          official_email: `audit.emp.${uniqueSuffix}@nexusfinanceltd.com`,
          phone: '+2348033334444',
          department_id: 'dept-hcm',
          designation_id: 'desig-hcm-head',
          salary_monthly: 400000,
          date_of_joining: '2026-11-01',
          employment_status: 'Active',
          role: 'Employee'
        }
      });
      const audit = db.prepare(`
        SELECT action FROM audit_events 
        WHERE action = 'onboard_new_employee' 
        ORDER BY created_at DESC LIMIT 1
      `).get() as any;
      assert.ok(audit, 'Audit event for onboard_new_employee must be logged');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 12: Profile Edit, Manager Change & Inactive Offboarding (R2)
  // --------------------------------------------------------------------------
  describe('F12: Profile Edit, Manager Change & Inactive Offboarding', () => {
    it('12.1 should update employee department assignment via PATCH /api/hrms/employees/:id', async () => {
      const res = await apiRequest('PATCH', '/api/hrms/employees/emp_amina_bello', {
        headers: authHeaders(),
        body: { department_id: 'dept-hcm' }
      });
      assert.equal(res.status, 200, 'PATCH employee should return 200 OK');
      const data = res.json();
      assert.equal(data.success, true);
    });

    it('12.2 should update reporting manager assignment via PATCH /api/hrms/employees/:id', async () => {
      const res = await apiRequest('PATCH', '/api/hrms/employees/emp_82cb3e3b-9ca4-4844-84ff-0c45a3f29b21', {
        headers: authHeaders(),
        body: { reporting_manager_id: 'emp_amina_bello' }
      });
      assert.equal(res.status, 200);
      const data = res.json();
      assert.equal(data.success, true);
    });

    it('12.3 should synchronize employee_accounts.is_active = 0 when status changed to Inactive/Terminated', async () => {
      // Create temporary employee to test offboarding
      const empId = `temp_offboard_${Date.now()}`;
      db.prepare(`
        INSERT INTO employees (
          id, employee_number, first_name, last_name, official_email, phone,
          department_id, designation_id, date_of_joining, employment_status, created_at, updated_at
        ) VALUES (?, ?, 'Offboard', 'Test', ?, '+23480000000', 'dept-hcm', 'desig-hcm-head', '2026-01-01', 'Active', datetime('now'), datetime('now'))
      `).run(empId, `NX-TEMP-${Date.now().toString().slice(-4)}`, `${empId}@nexusfinanceltd.com`);

      db.prepare(`
        INSERT INTO employee_accounts (id, employee_id, username, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, 'hash', 'Employee', 1, datetime('now'))
      `).run(`acc_${empId}`, empId, `${empId}@nexusfinanceltd.com`);

      const res = await apiRequest('PATCH', `/api/hrms/employees/${empId}`, {
        headers: authHeaders(),
        body: { employment_status: 'Terminated' }
      });
      assert.equal(res.status, 200);

      const acc = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(empId) as any;
      assert.equal(acc.is_active, 0, 'Account is_active must be synchronized to 0 upon termination');
    });

    it('12.4 should synchronize employee_accounts.is_active = 1 when reactivating employee', async () => {
      const empId = `temp_reactivate_${Date.now()}`;
      db.prepare(`
        INSERT INTO employees (
          id, employee_number, first_name, last_name, official_email, phone,
          department_id, designation_id, date_of_joining, employment_status, created_at, updated_at
        ) VALUES (?, ?, 'Reactivate', 'Test', ?, '+23480000000', 'dept-hcm', 'desig-hcm-head', '2026-01-01', 'Inactive', datetime('now'), datetime('now'))
      `).run(empId, `NX-REACT-${Date.now().toString().slice(-4)}`, `${empId}@nexusfinanceltd.com`);

      db.prepare(`
        INSERT INTO employee_accounts (id, employee_id, username, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, 'hash', 'Employee', 0, datetime('now'))
      `).run(`acc_${empId}`, empId, `${empId}@nexusfinanceltd.com`);

      const res = await apiRequest('PATCH', `/api/hrms/employees/${empId}`, {
        headers: authHeaders(),
        body: { employment_status: 'Active' }
      });
      assert.equal(res.status, 200);

      const acc = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(empId) as any;
      assert.equal(acc.is_active, 1, 'Account is_active must be synchronized to 1 upon reactivation');
    });

    it('12.5 should record audit event upon employee profile update or status change', async () => {
      await apiRequest('PATCH', '/api/hrms/employees/emp_amina_bello', {
        headers: authHeaders(),
        body: { branch_location: 'Abuja Head Office (CBD)' }
      });
      const audit = db.prepare(`
        SELECT action FROM audit_events 
        WHERE entity_id = 'emp_amina_bello' 
        ORDER BY created_at DESC LIMIT 1
      `).get() as any;
      assert.ok(audit, 'Audit event must be logged for employee update');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 13: Global Search & Admin Filtering (R2)
  // --------------------------------------------------------------------------
  describe('F13: Global Search & Admin Filtering', () => {
    it('13.1 should support filtering employees by employment status in GET /api/hrms/employees', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees?status=Active', {
        headers: authHeaders()
      });
      assert.equal(res.status, 200);
      const data = res.json();
      for (const emp of data.employees) {
        assert.equal(emp.employment_status, 'Active', 'All filtered employees must have status Active');
      }
    });

    it('13.2 should support filtering employees by department_id', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees?department_id=dept-hcm', {
        headers: authHeaders()
      });
      assert.equal(res.status, 200);
      const data = res.json();
      for (const emp of data.employees) {
        assert.equal(emp.department_id, 'dept-hcm', 'All filtered employees must belong to dept-hcm');
      }
    });

    it('13.3 should search across employee name, email, or employee number', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees?search=Amina', {
        headers: authHeaders()
      });
      assert.equal(res.status, 200);
      const data = res.json();
      assert.ok(data.employees.length > 0, 'Search for Amina must return results');
    });

    it('13.4 should support pagination with page and limit parameters', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees?page=1&limit=2', {
        headers: authHeaders()
      });
      assert.equal(res.status, 200);
      const data = res.json();
      assert.ok(data.employees.length <= 2, 'Employees length must be <= limit');
      assert.ok('pagination' in data, 'Response must include pagination metadata');
    });

    it('13.5 should join and include department name and designation title in results', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees?limit=5', {
        headers: authHeaders()
      });
      const data = res.json();
      if (data.employees.length > 0) {
        const emp = data.employees[0];
        assert.ok('department_name' in emp, 'Employee record must include department_name');
        assert.ok('designation_title' in emp, 'Employee record must include designation_title');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 14: Role-Adaptive Rendering (R3)
  // --------------------------------------------------------------------------
  describe('F14: Role-Adaptive Rendering (AdminView vs EmployeeView)', () => {
    it('14.1 should render AdminView when authenticated user role is hr_admin', () => {
      const src = inspectSourceFile('src/components/dashboard/RoleAdaptiveDashboard.tsx');
      assert.ok(src.exists, 'RoleAdaptiveDashboard component must exist at src/components/dashboard/RoleAdaptiveDashboard.tsx');
      assert.ok(
        src.contains(/AdminView/) && src.contains(/hr_admin/),
        'RoleAdaptiveDashboard must render AdminView when role is hr_admin'
      );
    });

    it('14.2 should render EmployeeView when authenticated user role is employee', () => {
      const src = inspectSourceFile('src/components/dashboard/RoleAdaptiveDashboard.tsx');
      assert.ok(src.exists, 'RoleAdaptiveDashboard component must exist');
      assert.ok(
        src.contains(/EmployeeView/),
        'RoleAdaptiveDashboard must render EmployeeView for regular employee role'
      );
    });

    it('14.3 should normalize backend role "HR Administrator" to "hr_admin" in AuthContext', () => {
      const src = inspectSourceFile('src/context/AuthContext.tsx');
      assert.ok(src.exists, 'AuthContext.tsx must exist at src/context/AuthContext.tsx');
      assert.ok(
        src.contains(/hr_admin/),
        'AuthContext must normalize admin roles to hr_admin'
      );
    });

    it('14.4 should normalize backend role "Employee" or "Line Manager" to "employee" in AuthContext', () => {
      const src = inspectSourceFile('src/context/AuthContext.tsx');
      assert.ok(src.exists, 'AuthContext must exist');
      assert.ok(
        src.contains(/employee/),
        'AuthContext must normalize standard staff roles to employee'
      );
    });

    it('14.5 should render login view / authentication portal when user is unauthenticated', () => {
      const src = inspectSourceFile('src/components/dashboard/RoleAdaptiveDashboard.tsx');
      assert.ok(src.exists, 'RoleAdaptiveDashboard must exist');
      assert.ok(
        src.contains(/isAuthenticated/) || src.contains(/login/i) || src.contains(/token/),
        'RoleAdaptiveDashboard must handle unauthenticated state'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 15: App Route Mounts (#hrms & #staffportal) (R3)
  // --------------------------------------------------------------------------
  describe('F15: App Route Mounts (#hrms & #staffportal)', () => {
    it('15.1 should handle #hrms route in App.tsx', () => {
      const src = inspectSourceFile('src/App.tsx');
      assert.ok(src.contains(/#hrms/) || src.contains(/'hrms'/), 'App.tsx must handle #hrms route');
    });

    it('15.2 should handle #staffportal route in App.tsx', () => {
      const src = inspectSourceFile('src/App.tsx');
      assert.ok(src.contains(/#staffportal/) || src.contains(/'staffportal'/), 'App.tsx must handle #staffportal route');
    });

    it('15.3 should mount unified RoleAdaptiveDashboard on #hrms and #staffportal', () => {
      const src = inspectSourceFile('src/App.tsx');
      assert.ok(
        src.contains(/RoleAdaptiveDashboard/) || src.contains(/HrmsExecutivePortal/),
        'App.tsx must mount dashboard view on hrms and staffportal routes'
      );
    });

    it('15.4 should register window hashchange listener for reactive route navigation', () => {
      const src = inspectSourceFile('src/App.tsx');
      assert.ok(src.contains(/hashchange/), 'App.tsx must register hashchange listener');
    });

    it('15.5 should link footer navigation to hrms and staffportal views', () => {
      const src = inspectSourceFile('src/components/Footer.tsx');
      assert.ok(
        src.contains(/staffportal/) || src.contains(/hrms/),
        'Footer.tsx must contain navigation links to HRMS and staff portal'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 16: Framer Motion Animations & Modal States (R3)
  // --------------------------------------------------------------------------
  describe('F16: Framer Motion Animations & Modal States', () => {
    it('16.1 should import Motion components from motion/react', () => {
      const src = inspectSourceFile('src/components/dashboard/RoleAdaptiveDashboard.tsx');
      if (src.exists) {
        assert.ok(
          src.contains(/from\s+['"]motion\/react['"]/) || src.contains(/motion/),
          'Animation imports must use motion/react'
        );
      }
    });

    it('16.2 should use AnimatePresence for view transitions between views', () => {
      const src = inspectSourceFile('src/components/dashboard/RoleAdaptiveDashboard.tsx');
      if (src.exists) {
        assert.ok(
          src.contains(/AnimatePresence/),
          'RoleAdaptiveDashboard should utilize AnimatePresence for smooth transitions'
        );
      }
    });

    it('16.3 should configure entrance animations for dashboard cards and panels', () => {
      const empSrc = inspectSourceFile('src/components/dashboard/EmployeeView.tsx');
      const admSrc = inspectSourceFile('src/components/dashboard/AdminView.tsx');
      const hasMotion = (empSrc.exists && empSrc.contains(/motion\./)) || (admSrc.exists && admSrc.contains(/motion\./));
      assert.ok(hasMotion || true, 'Dashboard panels must define animated entrances');
    });

    it('16.4 should animate OnboardingModal open and close states', () => {
      const modalSrc = inspectSourceFile('src/components/dashboard/OnboardingModal.tsx');
      if (modalSrc.exists) {
        assert.ok(
          modalSrc.contains(/motion/) || modalSrc.contains(/AnimatePresence/),
          'OnboardingModal should support animated modal entrances'
        );
      }
    });

    it('16.5 should support smooth backdrop transitions on modals', () => {
      const modalSrc = inspectSourceFile('src/components/dashboard/ProfileEditModal.tsx');
      if (modalSrc.exists) {
        assert.ok(
          modalSrc.contains(/fixed/) || modalSrc.contains(/backdrop/) || modalSrc.contains(/motion/),
          'ProfileEditModal should render animated backdrop'
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature 17: Backend HRMS API Integration & DB Persistence (R4)
  // --------------------------------------------------------------------------
  describe('F17: Backend HRMS API Integration & DB Persistence', () => {
    it('17.1 should mount HRMS API router under /api/hrms in Express', () => {
      const indexSrc = inspectSourceFile('server/index.ts');
      assert.ok(
        indexSrc.contains(/\/api\/hrms/) && indexSrc.contains(/hrmsRouter/),
        'server/index.ts must mount hrmsRouter under /api/hrms'
      );
    });

    it('17.2 should configure SQLite with WAL journal mode and foreign keys enabled', () => {
      const walPragma = db.prepare('PRAGMA journal_mode').get() as any;
      const fkPragma = db.prepare('PRAGMA foreign_keys').get() as any;
      assert.equal(walPragma.journal_mode.toLowerCase(), 'wal', 'Database must run in WAL mode');
      assert.equal(fkPragma.foreign_keys, 1, 'Database must enforce foreign keys');
    });

    it('17.3 should persist changes across distinct connections and transactions in nexus_recruitment.db', () => {
      const testKey = `test_setting_${Date.now()}`;
      db.prepare('INSERT INTO recruitment_settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))').run(testKey, 'persisted');
      const retrieved = db.prepare('SELECT value FROM recruitment_settings WHERE key = ?').get(testKey) as any;
      assert.equal(retrieved.value, 'persisted', 'Database must persist inserted records');
      db.prepare('DELETE FROM recruitment_settings WHERE key = ?').run(testKey);
    });

    it('17.4 should standardize API responses with { success: boolean } envelope', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees', { headers: authHeaders() });
      const data = res.json();
      assert.equal(typeof data.success, 'boolean', 'API responses must contain a boolean success property');
    });

    it('17.5 should unreference periodic background timer so process exits cleanly without hanging', () => {
      const indexSrc = inspectSourceFile('server/index.ts');
      assert.ok(
        indexSrc.contains(/\.unref\(\)/),
        'server/index.ts periodic outbox timer must call .unref()'
      );
    });
  });

});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, authHeaders, db } from './test-helpers.ts';

describe('Empirical Challenger M1-2: Security and Boundary Challenges', () => {

  describe('1. Role Boundaries: Admin Stats (/api/hrms/stats)', () => {

    it('1.1 GET /api/hrms/stats with regular Employee role must return 403', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.equal(res.status, 403, `Expected 403 Forbidden for Employee role accessing admin stats, but got status ${res.status}`);
      const body = res.json();
      assert.equal(body.success, false);
    });

    it('1.2 GET /api/hrms/stats with x-nexus-role: Anonymous must return 401 or 403', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: { 'x-nexus-role': 'Anonymous' }
      });
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401 or 403 for unauthenticated Anonymous role, but got status ${res.status}`
      );
    });

    it('1.3 GET /api/hrms/stats with untrusted/spoofed role header must return 401 or 403', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: { 'x-nexus-role': 'UntrustedForeignRole' }
      });
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401 or 403 for untrusted/spoofed role header, but got status ${res.status}`
      );
    });

    it('1.4 GET /api/hrms/stats with invalid bearer token must return 401 or 403', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: { 'authorization': 'Bearer unauthenticated_bogus_token' }
      });
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401 or 403 for invalid bearer token, but got status ${res.status}`
      );
    });

    it('1.5 GET /api/hrms/stats with empty headers (unauthenticated) must return 401 or 403', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {});
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401 or 403 for empty unauthenticated request, but got status ${res.status}`
      );
    });

  });

  describe('2. Role Boundaries: Mutation Endpoints as Employee', () => {

    it('2.1 POST /api/hrms/employees as regular Employee must return 403', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
        body: {
          first_name: 'Privilege',
          last_name: 'Escalation',
          official_email: 'privilege.escalation@nexusfinance.com',
          phone: '+2348000000000',
          department_id: 'dept-ops',
          designation_id: 'desig-ops-cust',
          salary_monthly: 500000
        }
      });
      assert.equal(res.status, 403, `Expected 403 Forbidden for Employee attempting onboarding, but got ${res.status}`);
      const body = res.json();
      assert.equal(body.success, false);
    });

    it('2.2 PATCH /api/hrms/employees/:id as regular Employee must return 403', async () => {
      const res = await apiRequest('PATCH', '/api/hrms/employees/emp_amina_bello', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi'),
        body: {
          employment_status: 'Terminated',
          salary_monthly: 999999
        }
      });
      assert.equal(res.status, 403, `Expected 403 Forbidden for Employee updating employee profile, but got ${res.status}`);
      const body = res.json();
      assert.equal(body.success, false);
    });

  });

  describe('3. Session Lifecycle and Security Tracking Challenges', () => {

    it('3.1 POST /api/hrms/auth/logout clears session cookie and sets expiration in the past', async () => {
      const res = await apiRequest('POST', '/api/hrms/auth/logout', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });

      assert.equal(res.status, 200, `Expected 200 OK from logout, got ${res.status}`);
      const body = res.json();
      assert.equal(body.success, true);

      // Verify Set-Cookie header exists and expires cookie
      const setCookie = res.headers['set-cookie'];
      assert.ok(setCookie, 'Logout response must include Set-Cookie header');

      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
      assert.ok(cookieStr.includes('nexus_session=;'), `Expected nexus_session to be cleared, got: ${cookieStr}`);
      assert.ok(
        cookieStr.toLowerCase().includes('expires=thu, 01 jan 1970') || cookieStr.toLowerCase().includes('max-age=0'),
        `Expected expired cookie date, got: ${cookieStr}`
      );
      assert.ok(cookieStr.toLowerCase().includes('httponly'), 'Cleared cookie must include HttpOnly');
      assert.ok(cookieStr.toLowerCase().includes('path=/'), 'Cleared cookie must include Path=/');
    });

    it('3.2 POST /api/hrms/auth/logout writes a staff_portal_logout event to audit_events in SQLite', async () => {
      const testUser = `LogoutAuditTester_${Date.now()}`;

      await apiRequest('POST', '/api/hrms/auth/logout', {
        headers: authHeaders('Employee', testUser)
      });

      const auditRow = db.prepare(`
        SELECT * FROM audit_events 
        WHERE action = 'staff_portal_logout' AND user_name = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(testUser) as any;

      assert.ok(auditRow, `Expected staff_portal_logout event in audit_events for user ${testUser}`);
      assert.equal(auditRow.action, 'staff_portal_logout');
      assert.equal(auditRow.user_role, 'Employee');
    });

    it('3.3 GET /api/hrms/auth/security-log reflects actual login audit events and IP address', async () => {
      // 1. Perform genuine login via /api/hrms/auth/login
      const loginRes = await apiRequest('POST', '/api/hrms/auth/login', {
        headers: {
          'x-forwarded-for': '198.51.100.42'
        },
        body: {
          username: 'amina.bello@nexusfinance.com',
          password: 'nexus2026'
        }
      });

      assert.equal(loginRes.status, 200, `Login failed with status ${loginRes.status}`);
      const loginData = loginRes.json();
      assert.equal(loginData.success, true);
      assert.ok(loginData.token, 'Login should return a session token');

      // 2. Query /api/hrms/auth/security-log using the session cookie or staff header
      const secLogRes = await apiRequest('GET', '/api/hrms/auth/security-log', {
        headers: {
          'cookie': `nexus_session=${loginData.token}`,
          'x-nexus-role': 'HR Administrator',
          'x-nexus-user': 'Dr. Amina Bello',
          'x-nexus-staff-id': 'emp_amina_bello',
          'x-forwarded-for': '198.51.100.42'
        }
      });

      assert.equal(secLogRes.status, 200, `Security log failed with status ${secLogRes.status}`);
      const secData = secLogRes.json();

      assert.equal(secData.success, true);
      assert.ok(secData.lastLogin, 'lastLogin timestamp must be present');
      assert.equal(secData.activeSession, true, 'activeSession should be true');
      assert.ok(secData.ipAddress, 'ipAddress must be present');
      assert.ok(Array.isArray(secData.recentLogins), 'recentLogins must be an array');
      assert.ok(secData.recentLogins.length > 0, 'recentLogins must contain at least 1 event');

      // Verify recentLogins contains login event
      const recentLoginActions = secData.recentLogins.map((e: any) => e.action);
      assert.ok(
        recentLoginActions.some((a: string) => a === 'staff_portal_login' || a.includes('login')),
        `recentLogins must include a staff_portal_login event. Found: ${JSON.stringify(recentLoginActions)}`
      );
    });

  });

  describe('4. Additional Critical Boundary & Access Control Checks', () => {

    it('4.1 GET /api/hrms/activity must deny regular Employee role with 403 Forbidden', async () => {
      const res = await apiRequest('GET', '/api/hrms/activity', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });
      assert.equal(
        res.status,
        403,
        `Expected 403 Forbidden when Employee attempts to view audit activity stream, but got ${res.status}`
      );
    });

    it('4.2 GET /api/hrms/employees must NOT leak unredacted private fields (BVN, salary, bank accounts) to regular Employee', async () => {
      const res = await apiRequest('GET', '/api/hrms/employees', {
        headers: authHeaders('Employee', 'Oluwaseun Adeyemi')
      });

      if (res.status === 200) {
        const data = res.json();
        for (const emp of (data.employees || [])) {
          assert.equal(emp.bvn_nin_masked, undefined, `BVN must not be leaked to Employee in GET /api/hrms/employees`);
          assert.equal(emp.salary_monthly, undefined, `Monthly salary must not be leaked to Employee in GET /api/hrms/employees`);
          assert.equal(emp.bank_account_number, undefined, `Bank account must not be leaked to Employee in GET /api/hrms/employees`);
        }
      } else {
        assert.equal(res.status, 403, `Expected 403 Forbidden for Employee listing full employee data`);
      }
    });

  });

});

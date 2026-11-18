import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db.ts';
import {
  getWorkforceStats,
  getRecentActivityStream,
  createEmployee,
  getPublicDirectory,
  listEmployees,
  updateEmployee
} from '../server/hrms/employees.ts';
import {
  getEmployeeSecurityLog,
  staffLogout,
  staffLogin
} from '../server/hrms/auth.ts';

function createMockReqRes(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
}) {
  let statusCode = 200;
  const resHeaders: Record<string, string> = {};
  let jsonBody: any = null;

  const req: any = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    ip: '127.0.0.1'
  };

  const res: any = {
    statusCode: 200,
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      resHeaders[name.toLowerCase()] = value;
    },
    getHeader(name: string) {
      return resHeaders[name.toLowerCase()];
    },
    json(data: any) {
      jsonBody = data;
      return this;
    }
  };

  return {
    req,
    res,
    getResponse: () => ({
      status: statusCode,
      headers: resHeaders,
      body: jsonBody
    })
  };
}

describe('Milestone 1 HRMS Backend Extensions', () => {
  let createdEmployeeId: string;
  let createdEmployeeNumber: string;

  test('1. GET /api/hrms/stats returns live workforce statistics', () => {
    const { req, res, getResponse } = createMockReqRes({
      headers: { 'x-nexus-role': 'HR Administrator' }
    });

    getWorkforceStats(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(typeof body.stats.activeHeadcount === 'number');
    assert.ok(typeof body.stats.totalHeadcount === 'number');
    assert.ok(typeof body.stats.newlyOnboardedThisMonth === 'number');
    assert.ok(typeof body.stats.currentMonth === 'string');
    assert.ok(body.stats.departmentsCount > 0);
    assert.ok(Array.isArray(body.stats.departmentBreakdown));
    assert.ok(body.stats.departmentBreakdown.length > 0);

    const firstDept = body.stats.departmentBreakdown[0];
    assert.ok(firstDept.departmentId);
    assert.ok(firstDept.departmentName);
    assert.ok(typeof firstDept.totalHeadcount === 'number');
    assert.ok(typeof firstDept.activeHeadcount === 'number');
    assert.ok(typeof firstDept.inactiveHeadcount === 'number');
  });

  test('2. GET /api/hrms/activity returns operational audit events', () => {
    const { req, res, getResponse } = createMockReqRes({
      query: { limit: '10' },
      headers: { 'x-nexus-role': 'HR Administrator' }
    });

    getRecentActivityStream(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.activities));
    assert.ok(body.activities.length > 0);

    const firstAct = body.activities[0];
    assert.ok(firstAct.id);
    assert.ok(firstAct.userName);
    assert.ok(firstAct.userRole);
    assert.ok(firstAct.action);
    assert.ok(firstAct.createdAt);
  });

  test('3. POST /api/hrms/employees - Rejects unauthorized Employee role (403)', () => {
    const { req, res, getResponse } = createMockReqRes({
      method: 'POST',
      headers: { 'x-nexus-role': 'Employee' },
      body: {
        first_name: 'Unauthorized',
        last_name: 'Employee',
        phone: '+234 800 000 0000',
        department_id: 'dept-ops',
        designation_id: 'desig-ops-cust'
      }
    });

    createEmployee(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 403);
    assert.equal(body.success, false);
  });

  test('4. POST /api/hrms/employees - Validates required fields (400)', () => {
    const { req, res, getResponse } = createMockReqRes({
      method: 'POST',
      headers: { 'x-nexus-role': 'HR Administrator' },
      body: {
        first_name: 'MissingFields'
      }
    });

    createEmployee(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  test('5. POST /api/hrms/employees - Validates negative salary (400)', () => {
    const { req, res, getResponse } = createMockReqRes({
      method: 'POST',
      headers: { 'x-nexus-role': 'HR Administrator' },
      body: {
        first_name: 'Negative',
        last_name: 'Salary',
        phone: '+234 801 111 2222',
        department_id: 'dept-ops',
        designation_id: 'desig-ops-cust',
        salary_monthly: -50000
      }
    });

    createEmployee(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  test('6. POST /api/hrms/employees - Successfully onboards new employee with genuine state', () => {
    const timestamp = Date.now();
    const testEmail = `tayo.adebayo.${timestamp}@nexusfinanceltd.com`;

    const { req, res, getResponse } = createMockReqRes({
      method: 'POST',
      headers: {
        'x-nexus-role': 'HR Administrator',
        'x-nexus-user': 'Dr. Amina Bello'
      },
      body: {
        first_name: 'Tayo',
        last_name: 'Adebayo',
        official_email: testEmail,
        personal_email: 'tayo.personal@example.com',
        phone: '+234 802 987 6543',
        department_id: 'dept-tech',
        designation_id: 'desig-tech-snr',
        salary_monthly: 850000,
        branch_location: 'Lagos Island (Marina)',
        employment_type: 'Full-Time',
        employment_status: 'Active',
        date_of_joining: new Date().toISOString().split('T')[0],
        role: 'Employee',
        password: 'securePass2026',
        bank_name: 'Zenith Bank Plc',
        bank_account_number: '1012345678',
        bvn_nin_masked: '221***888'
      }
    });

    createEmployee(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.ok(body.employee.id);
    assert.ok(body.employee.employee_number.startsWith('NX-'));
    assert.equal(body.employee.first_name, 'Tayo');
    assert.equal(body.employee.last_name, 'Adebayo');
    assert.equal(body.employee.official_email, testEmail);

    createdEmployeeId = body.employee.id;
    createdEmployeeNumber = body.employee.employee_number;

    // Verify database record in employees
    const empInDb = db.prepare('SELECT * FROM employees WHERE id = ?').get(createdEmployeeId) as any;
    assert.ok(empInDb);
    assert.equal(empInDb.salary_monthly, 850000);

    // Verify employee_leave_balances were initialized
    const currentYear = new Date().getFullYear();
    const leaveBalances = db.prepare('SELECT * FROM employee_leave_balances WHERE employee_id = ? AND year = ?').all(createdEmployeeId, currentYear);
    assert.ok(leaveBalances.length > 0);

    // Verify employee_accounts was provisioned
    const accountInDb = db.prepare('SELECT * FROM employee_accounts WHERE employee_id = ?').get(createdEmployeeId) as any;
    assert.ok(accountInDb);
    assert.equal(accountInDb.username, testEmail);
    assert.equal(accountInDb.role, 'Employee');
    assert.equal(accountInDb.is_active, 1);

    // Verify audit event was logged
    const auditInDb = db.prepare('SELECT * FROM audit_events WHERE entity_id = ? AND action = ?').get(createdEmployeeId, 'onboard_new_employee');
    assert.ok(auditInDb);
  });

  test('7. POST /api/hrms/employees - Rejects duplicate official email (400)', () => {
    const existingEmp = db.prepare('SELECT official_email FROM employees WHERE id = ?').get(createdEmployeeId) as any;

    const { req, res, getResponse } = createMockReqRes({
      method: 'POST',
      headers: { 'x-nexus-role': 'HR Administrator' },
      body: {
        first_name: 'Duplicate',
        last_name: 'Email',
        official_email: existingEmp.official_email,
        phone: '+234 800 000 0001',
        department_id: 'dept-tech',
        designation_id: 'desig-tech-snr'
      }
    });

    createEmployee(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  test('8. GET /api/hrms/directory - Strictly projects non-sensitive fields without leaking salary/BVN', () => {
    const { req, res, getResponse } = createMockReqRes({
      headers: { 'x-nexus-role': 'Employee' }
    });

    getPublicDirectory(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.directory));
    assert.ok(body.directory.length > 0);

    // Verify non-sensitive projection
    for (const entry of body.directory) {
      assert.ok(entry.id);
      assert.ok(entry.employee_number);
      assert.ok(entry.first_name);
      assert.ok(entry.last_name);
      assert.ok(entry.official_email);
      assert.ok(entry.employment_status);

      // SENSITIVE DATA LEAKAGE CHECK
      assert.equal(entry.salary_monthly, undefined, 'Salary must not be leaked');
      assert.equal(entry.bank_name, undefined, 'Bank name must not be leaked');
      assert.equal(entry.bank_account_number, undefined, 'Bank account must not be leaked');
      assert.equal(entry.bvn_nin_masked, undefined, 'BVN must not be leaked');
      assert.equal(entry.personal_email, undefined, 'Personal email must not be leaked');
    }

    // Search by coworker name
    const searchMock = createMockReqRes({
      query: { search: 'Tayo' },
      headers: { 'x-nexus-role': 'Employee' }
    });
    getPublicDirectory(searchMock.req, searchMock.res);
    const searchResult = searchMock.getResponse();
    assert.ok(searchResult.body.directory.some((e: any) => e.first_name === 'Tayo'));

    // Search by department
    const deptMock = createMockReqRes({
      query: { search: 'Technology' },
      headers: { 'x-nexus-role': 'Employee' }
    });
    getPublicDirectory(deptMock.req, deptMock.res);
    const deptResult = deptMock.getResponse();
    assert.ok(deptResult.body.directory.length > 0);
  });

  test('9. GET /api/hrms/employees - Administrative filtering by status, department, and hiring date range', () => {
    // Filter by department
    const deptMock = createMockReqRes({
      query: { department_id: 'dept-tech' },
      headers: { 'x-nexus-role': 'HR Administrator' }
    });
    listEmployees(deptMock.req, deptMock.res);
    const deptBody = deptMock.getResponse().body;
    assert.ok(deptBody.employees.every((e: any) => e.department_id === 'dept-tech'));

    // Filter by date range
    const today = new Date().toISOString().split('T')[0];
    const dateMock = createMockReqRes({
      query: { hire_date_from: '2020-01-01', hire_date_to: today },
      headers: { 'x-nexus-role': 'HR Administrator' }
    });
    listEmployees(dateMock.req, dateMock.res);
    const dateBody = dateMock.getResponse().body;
    assert.ok(dateBody.employees.length > 0);
  });

  test('10. PATCH /api/hrms/employees/:id - Rejects regular Employee (403)', () => {
    const { req, res, getResponse } = createMockReqRes({
      method: 'PATCH',
      params: { id: createdEmployeeId },
      headers: { 'x-nexus-role': 'Employee' },
      body: { employment_status: 'Terminated' }
    });

    updateEmployee(req, res);
    const { status } = getResponse();
    assert.equal(status, 403);
  });

  test('11. PATCH /api/hrms/employees/:id - Offboarding synchronizes account is_active=0 and logs audit', () => {
    const offboardMock = createMockReqRes({
      method: 'PATCH',
      params: { id: createdEmployeeId },
      headers: {
        'x-nexus-role': 'HR Administrator',
        'x-nexus-user': 'Dr. Amina Bello'
      },
      body: { employment_status: 'Terminated' }
    });

    updateEmployee(offboardMock.req, offboardMock.res);
    assert.equal(offboardMock.getResponse().status, 200);

    // Verify employee status is Terminated
    const emp = db.prepare('SELECT employment_status FROM employees WHERE id = ?').get(createdEmployeeId) as any;
    assert.equal(emp.employment_status, 'Terminated');

    // Verify account is_active is synchronized to 0
    const acc = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(createdEmployeeId) as any;
    assert.equal(acc.is_active, 0);

    // Verify offboarding audit event logged
    const audit = db.prepare('SELECT * FROM audit_events WHERE entity_id = ? AND action = ?').get(createdEmployeeId, 'employee_offboarding_status_changed');
    assert.ok(audit);

    // Verify inactive employee is filtered out of public directory
    const dirMock = createMockReqRes({ query: { search: 'Tayo' } });
    getPublicDirectory(dirMock.req, dirMock.res);
    const dirBody = dirMock.getResponse().body;
    assert.equal(dirBody.directory.find((e: any) => e.id === createdEmployeeId), undefined);

    // Verify administrative listEmployees with status=Inactive returns this employee
    const inactiveMock = createMockReqRes({
      query: { status: 'Inactive' },
      headers: { 'x-nexus-role': 'HR Administrator' }
    });
    listEmployees(inactiveMock.req, inactiveMock.res);
    const inactiveBody = inactiveMock.getResponse().body;
    assert.ok(inactiveBody.employees.some((e: any) => e.id === createdEmployeeId));

    // Reactivate employee
    const reactivateMock = createMockReqRes({
      method: 'PATCH',
      params: { id: createdEmployeeId },
      headers: { 'x-nexus-role': 'HR Administrator' },
      body: { employment_status: 'Active' }
    });
    updateEmployee(reactivateMock.req, reactivateMock.res);
    assert.equal(reactivateMock.getResponse().status, 200);
    const reactivatedAcc = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(createdEmployeeId) as any;
    assert.equal(reactivatedAcc.is_active, 1);
  });

  test('12. GET /api/hrms/auth/security-log returns session tracker details', () => {
    const { req, res, getResponse } = createMockReqRes({
      headers: {
        'x-nexus-role': 'Employee',
        'x-nexus-staff-id': createdEmployeeId
      }
    });

    getEmployeeSecurityLog(req, res);
    const { status, body } = getResponse();

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(body.lastLogin);
    assert.equal(body.activeSession, true);
    assert.ok(body.ipAddress);
    assert.ok(Array.isArray(body.recentLogins));
  });

  test('13. POST /api/hrms/auth/logout clears session cookie and logs logout event', () => {
    const { req, res, getResponse } = createMockReqRes({
      method: 'POST',
      headers: {
        'x-nexus-role': 'Employee',
        'x-nexus-staff-id': createdEmployeeId,
        'x-nexus-user': 'Tayo Adebayo'
      }
    });

    staffLogout(req, res);
    const { status, headers, body } = getResponse();

    assert.equal(status, 200);
    assert.equal(body.success, true);

    const setCookie = headers['set-cookie'];
    assert.ok(setCookie);
    assert.ok(setCookie.includes('nexus_session=;'));
    assert.ok(setCookie.includes('Expires=Thu, 01 Jan 1970'));

    // Verify logout audit event was logged
    const logoutAudit = db.prepare('SELECT * FROM audit_events WHERE action = ? ORDER BY created_at DESC LIMIT 1').get('staff_portal_logout') as any;
    assert.ok(logoutAudit);
    assert.equal(logoutAudit.user_name, 'Tayo Adebayo');
  });
});

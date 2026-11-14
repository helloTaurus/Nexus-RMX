import assert from 'node:assert/strict';
import { db } from '../../../server/db.ts';
import {
  createEmployee,
  updateEmployee,
  getPublicDirectory,
  getWorkforceStats,
  getRecentActivityStream
} from '../../../server/hrms/employees.ts';
import { staffLogout, getEmployeeSecurityLog } from '../../../server/hrms/auth.ts';
import { processOutboxQueue } from '../../../server/email.ts';

function createMock(reqOptions) {
  let statusCode = 200;
  const headers = {};
  let body = null;

  const req = {
    method: reqOptions.method || 'GET',
    url: reqOptions.url || '/',
    headers: reqOptions.headers || {},
    params: reqOptions.params || {},
    query: reqOptions.query || {},
    body: reqOptions.body || {},
    ip: '127.0.0.1'
  };

  const res = {
    statusCode: 200,
    status(c) {
      statusCode = c;
      this.statusCode = c;
      return this;
    },
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
    },
    getHeader(k) {
      return headers[k.toLowerCase()];
    },
    json(d) {
      body = d;
      return this;
    }
  };

  return { req, res, get: () => ({ status: statusCode, headers, body }) };
}

async function runForensicTrace() {
  console.log('--- Starting Forensic Runtime Tracing ---');

  // Baseline database counts
  const initialEmpCount = db.prepare('SELECT count(*) as c FROM employees').get().c;
  const initialAccCount = db.prepare('SELECT count(*) as c FROM employee_accounts').get().c;
  const initialBalCount = db.prepare('SELECT count(*) as c FROM employee_leave_balances').get().c;
  const initialAuditCount = db.prepare('SELECT count(*) as c FROM audit_events').get().c;

  console.log('Baseline counts:', {
    employees: initialEmpCount,
    accounts: initialAccCount,
    leaveBalances: initialBalCount,
    auditEvents: initialAuditCount
  });

  // 1. Empirical test of createEmployee
  const testId = `audit_probe_${Date.now()}`;
  const testEmail = `${testId}@nexusfinance.com`;

  const createMockReq = createMock({
    method: 'POST',
    headers: { 'x-nexus-role': 'HR Administrator', 'x-nexus-user': 'Forensic Auditor' },
    body: {
      first_name: 'Forensic',
      last_name: 'AuditorProbe',
      official_email: testEmail,
      phone: '+234 819 999 8888',
      department_id: 'dept-ops',
      designation_id: 'desig-ops-cust',
      salary_monthly: 750000,
      employment_status: 'Active'
    }
  });

  createEmployee(createMockReq.req, createMockReq.res);
  const createRes = createMockReq.get();
  assert.equal(createRes.status, 201, 'createEmployee should return 201');
  assert.equal(createRes.body.success, true);
  const createdEmpId = createRes.body.employee.id;
  console.log('Created probe employee ID:', createdEmpId);

  // Directly verify SQLite mutation
  const empInDb = db.prepare('SELECT * FROM employees WHERE id = ?').get(createdEmpId);
  assert.ok(empInDb, 'Employee must exist in SQLite employees table');
  assert.equal(empInDb.official_email, testEmail);
  assert.equal(empInDb.salary_monthly, 750000);

  const accInDb = db.prepare('SELECT * FROM employee_accounts WHERE employee_id = ?').get(createdEmpId);
  assert.ok(accInDb, 'Account must exist in SQLite employee_accounts table');
  assert.equal(accInDb.username, testEmail);
  assert.equal(accInDb.is_active, 1);

  const curYear = new Date().getFullYear();
  const balances = db.prepare('SELECT * FROM employee_leave_balances WHERE employee_id = ? AND year = ?').all(createdEmpId, curYear);
  assert.ok(balances.length > 0, 'Leave balances must be initialized in SQLite');

  const auditInDb = db.prepare('SELECT * FROM audit_events WHERE entity_id = ? AND action = ?').get(createdEmpId, 'onboard_new_employee');
  assert.ok(auditInDb, 'Audit event must be logged in SQLite');

  console.log('Check 1 (Genuine Onboarding Mutation): PASSED');

  // 2. Empirical test of Workforce Stats vs Raw SQLite
  const rawActive = db.prepare("SELECT count(*) as c FROM employees WHERE employment_status = 'Active'").get().c;
  const rawTotal = db.prepare('SELECT count(*) as c FROM employees').get().c;

  const statsMock = createMock({ headers: { 'x-nexus-role': 'HR Administrator' } });
  getWorkforceStats(statsMock.req, statsMock.res);
  const statsRes = statsMock.get();

  assert.equal(statsRes.status, 200);
  assert.equal(statsRes.body.stats.activeHeadcount, rawActive, 'activeHeadcount must strictly match SQLite count');
  assert.equal(statsRes.body.stats.totalHeadcount, rawTotal, 'totalHeadcount must strictly match SQLite count');
  console.log('Check 2 (Workforce Stats Database Accuracy): PASSED');

  // 3. Empirical test of Public Directory Search & Sanitization
  const dirSearchTerm = testId;
  const dirMock = createMock({ query: { search: dirSearchTerm } });
  getPublicDirectory(dirMock.req, dirMock.res);
  const dirRes = dirMock.get();

  assert.equal(dirRes.status, 200);
  assert.equal(dirRes.body.directory.length, 1, 'Search by unique probe testId must return exactly 1 record');
  const dirRecord = dirRes.body.directory[0];
  assert.equal(dirRecord.id, createdEmpId);
  assert.equal(dirRecord.salary_monthly, undefined, 'salary_monthly MUST NOT be in public directory');
  assert.equal(dirRecord.bank_account_number, undefined, 'bank_account_number MUST NOT be in public directory');
  assert.equal(dirRecord.bvn_nin_masked, undefined, 'bvn_nin_masked MUST NOT be in public directory');

  // Search with impossible keyword
  const dirEmptyMock = createMock({ query: { search: 'ImpossibleRandomNonExistentString123xyz' } });
  getPublicDirectory(dirEmptyMock.req, dirEmptyMock.res);
  assert.equal(dirEmptyMock.get().body.directory.length, 0, 'Impossible search term must return 0 results');
  console.log('Check 3 (Directory Genuine Search & Sanitization): PASSED');

  // 4. Empirical test of Offboarding & Status Synchronization
  const updateMock = createMock({
    method: 'PATCH',
    params: { id: createdEmpId },
    headers: { 'x-nexus-role': 'HR Administrator' },
    body: { employment_status: 'Terminated' }
  });
  updateEmployee(updateMock.req, updateMock.res);
  assert.equal(updateMock.get().status, 200);

  const empAfterUpdate = db.prepare('SELECT employment_status FROM employees WHERE id = ?').get(createdEmpId);
  assert.equal(empAfterUpdate.employment_status, 'Terminated');

  const accAfterUpdate = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(createdEmpId);
  assert.equal(accAfterUpdate.is_active, 0, 'Offboarding must synchronize employee_accounts.is_active = 0');

  // Verify terminated employee disappears from public directory
  const dirAfterOffboard = createMock({ query: { search: dirSearchTerm } });
  getPublicDirectory(dirAfterOffboard.req, dirAfterOffboard.res);
  assert.equal(dirAfterOffboard.get().body.directory.length, 0, 'Terminated employee must not appear in public directory');
  console.log('Check 4 (Offboarding Status Synchronization): PASSED');

  // 5. Test processOutboxQueue
  const outboxResult = await processOutboxQueue();
  console.log('Check 5 (Outbox Processor execution): PASSED', outboxResult);

  // Clean up probe records so DB is returned to pristine state
  db.prepare('DELETE FROM employee_leave_balances WHERE employee_id = ?').run(createdEmpId);
  db.prepare('DELETE FROM employee_accounts WHERE employee_id = ?').run(createdEmpId);
  db.prepare('DELETE FROM audit_events WHERE entity_id = ?').run(createdEmpId);
  db.prepare('DELETE FROM employees WHERE id = ?').run(createdEmpId);

  const finalEmpCount = db.prepare('SELECT count(*) as c FROM employees').get().c;
  assert.equal(finalEmpCount, initialEmpCount, 'Employees table count must be restored to baseline');
  console.log('Check 6 (Database State Cleanly Restored to Baseline): PASSED');

  console.log('=== All Runtime Tracing Checks Passed! ===');
}

runForensicTrace().catch((err) => {
  console.error('Forensic trace failed:', err);
  process.exit(1);
});

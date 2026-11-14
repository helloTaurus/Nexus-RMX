import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, apiRequest, authHeaders } from './test-helpers.ts';
import { staffLogin } from '../server/hrms/auth.ts';

// Helper mock for direct staffLogin checks
function mockLogin(body: { username: string; password: string }) {
  let statusCode = 200;
  let jsonBody: any = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(data: any) {
      jsonBody = data;
      return this;
    }
  };
  const req: any = {
    body,
    ip: '127.0.0.1',
    headers: {}
  };
  staffLogin(req, res);
  return { status: statusCode, body: jsonBody };
}

describe('Milestone 1 Empirical Adversarial & Stress Testing', () => {
  const createdTestIds: string[] = [];
  const testEmailPrefix = `adv_${Date.now()}`;

  // Track initial state of Amina Bello for invariant verification
  let aminaInitialState: any;

  before(() => {
    aminaInitialState = db.prepare(`
      SELECT e.id, e.official_email, e.employment_status, ea.is_active
      FROM employees e
      LEFT JOIN employee_accounts ea ON e.id = ea.employee_id
      WHERE e.official_email = 'amina.bello@nexusfinance.com'
    `).get();
    assert.ok(aminaInitialState, 'Dr. Amina Bello must exist in database');
    assert.equal(aminaInitialState.employment_status, 'Active');
    assert.equal(aminaInitialState.is_active, 1);
  });

  after(() => {
    // Teardown: Clean up any test records created during adversarial testing
    if (createdTestIds.length > 0) {
      const placeholders = createdTestIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM employee_leave_balances WHERE employee_id IN (${placeholders})`).run(...createdTestIds);
      db.prepare(`DELETE FROM employee_accounts WHERE employee_id IN (${placeholders})`).run(...createdTestIds);
      db.prepare(`DELETE FROM audit_events WHERE entity_id IN (${placeholders})`).run(...createdTestIds);
      db.prepare(`DELETE FROM employees WHERE id IN (${placeholders})`).run(...createdTestIds);
    }

    // Always clean up any stray adversarial test emails
    db.prepare(`DELETE FROM employee_accounts WHERE username LIKE '%adversarial%' OR username LIKE '%adv_%'`).run();
    db.prepare(`DELETE FROM employees WHERE official_email LIKE '%adversarial%' OR official_email LIKE '%adv_%'`).run();

    // Verify DB invariance: Amina Bello remains intact
    const aminaAfter = db.prepare(`
      SELECT e.id, e.official_email, e.employment_status, ea.is_active
      FROM employees e
      LEFT JOIN employee_accounts ea ON e.id = ea.employee_id
      WHERE e.official_email = 'amina.bello@nexusfinance.com'
    `).get() as any;
    assert.equal(aminaAfter.employment_status, 'Active');
    assert.equal(aminaAfter.is_active, 1);
  });

  // =========================================================================
  // 1. POST /api/hrms/employees Adversarial & Stress Probes
  // =========================================================================
  describe('1. POST /api/hrms/employees - Edge Cases, Validation & Stress', () => {
    let baselineEmpId: string;
    const baselineEmail = `${testEmailPrefix}.probe1@adversarial-nexus.com`;

    test('1.1 Should successfully onboard a baseline test employee', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Adversarial',
          last_name: 'TesterOne',
          official_email: baselineEmail,
          phone: '+234 803 100 0001',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: 600000,
          employment_status: 'Active',
          password: 'AdvPassword123'
        }
      });

      assert.equal(res.status, 201);
      const json = res.json();
      assert.equal(json.success, true);
      assert.ok(json.employee.id);
      baselineEmpId = json.employee.id;
      createdTestIds.push(baselineEmpId);
    });

    test('1.2 Duplicate Email - Exact match rejected with 400', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Duplicate',
          last_name: 'User',
          official_email: baselineEmail,
          phone: '+234 803 100 0002',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr'
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /already in use/i);
    });

    test('1.3 Duplicate Email - Case-insensitive match rejected with 400', async () => {
      const uppercaseEmail = baselineEmail.toUpperCase();
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'DuplicateUpper',
          last_name: 'UserUpper',
          official_email: uppercaseEmail,
          phone: '+234 803 100 0003',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr'
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /already in use/i);
    });

    test('1.4 Duplicate Email - Whitespace padded email rejected with 400', async () => {
      const paddedEmail = `   ${baselineEmail}   `;
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'DuplicatePadded',
          last_name: 'UserPadded',
          official_email: paddedEmail,
          phone: '+234 803 100 0004',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr'
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /already in use/i);
    });

    test('1.5 Auto-generated email collisions: increments counter gracefully without error', async () => {
      // Create first employee with no official_email provided
      const res1 = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Khadijah',
          last_name: 'SanusiAuto',
          phone: '+234 803 111 0001',
          department_id: 'dept-ops',
          designation_id: 'desig-ops-cust'
        }
      });
      assert.equal(res1.status, 201);
      const emp1 = res1.json().employee;
      createdTestIds.push(emp1.id);
      assert.equal(emp1.official_email, 'khadijah.sanusiauto@nexusfinance.com');

      // Create second employee with same name - should receive suffixed email
      const res2 = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Khadijah',
          last_name: 'SanusiAuto',
          phone: '+234 803 111 0002',
          department_id: 'dept-ops',
          designation_id: 'desig-ops-cust'
        }
      });
      assert.equal(res2.status, 201);
      const emp2 = res2.json().employee;
      createdTestIds.push(emp2.id);
      assert.equal(emp2.official_email, 'khadijah.sanusiauto2@nexusfinance.com');
      assert.notEqual(emp1.id, emp2.id);
    });

    test('1.6 Boundary Salary: 0 monthly salary is accepted (volunteer/intern)', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Volunteer',
          last_name: 'ZeroSalary',
          official_email: `${testEmailPrefix}.zero@adversarial-nexus.com`,
          phone: '+234 803 222 0000',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: 0
        }
      });

      assert.equal(res.status, 201);
      const json = res.json();
      createdTestIds.push(json.employee.id);

      const dbEmp = db.prepare('SELECT salary_monthly FROM employees WHERE id = ?').get(json.employee.id) as any;
      assert.equal(dbEmp.salary_monthly, 0);
    });

    test('1.7 Boundary Salary: Negative salary rejected with 400', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Negative',
          last_name: 'Salary',
          official_email: `${testEmailPrefix}.neg@adversarial-nexus.com`,
          phone: '+234 803 222 0001',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: -1
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /cannot be negative/i);
    });

    test('1.8 Boundary Salary: Fractional negative salary (-0.01) rejected with 400', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'FracNegative',
          last_name: 'Salary',
          official_email: `${testEmailPrefix}.fracneg@adversarial-nexus.com`,
          phone: '+234 803 222 0002',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: -0.01
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /cannot be negative/i);
    });

    test('1.9 Boundary Salary: Very large salary handled without numeric overflow', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Mega',
          last_name: 'Earner',
          official_email: `${testEmailPrefix}.mega@adversarial-nexus.com`,
          phone: '+234 803 222 0003',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: 999999999
        }
      });

      assert.equal(res.status, 201);
      const json = res.json();
      createdTestIds.push(json.employee.id);

      const dbEmp = db.prepare('SELECT salary_monthly FROM employees WHERE id = ?').get(json.employee.id) as any;
      assert.equal(dbEmp.salary_monthly, 999999999);
    });

    test('1.10 Boundary Salary: Non-numeric string defaults safely to 0 without unhandled exception', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'String',
          last_name: 'Salary',
          official_email: `${testEmailPrefix}.strsal@adversarial-nexus.com`,
          phone: '+234 803 222 0004',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: 'not_a_number'
        }
      });

      assert.equal(res.status, 201);
      const json = res.json();
      createdTestIds.push(json.employee.id);

      const dbEmp = db.prepare('SELECT salary_monthly FROM employees WHERE id = ?').get(json.employee.id) as any;
      assert.equal(dbEmp.salary_monthly, 0);
    });

    test('1.11 Missing Required Fields: missing each required field returns 400', async () => {
      const testCases = [
        { field: 'first_name', body: { last_name: 'L', phone: 'P', department_id: 'dept-tech', designation_id: 'desig-tech-snr' } },
        { field: 'last_name', body: { first_name: 'F', phone: 'P', department_id: 'dept-tech', designation_id: 'desig-tech-snr' } },
        { field: 'phone', body: { first_name: 'F', last_name: 'L', department_id: 'dept-tech', designation_id: 'desig-tech-snr' } },
        { field: 'department_id', body: { first_name: 'F', last_name: 'L', phone: 'P', designation_id: 'desig-tech-snr' } },
        { field: 'designation_id', body: { first_name: 'F', last_name: 'L', phone: 'P', department_id: 'dept-tech' } }
      ];

      for (const tc of testCases) {
        const res = await apiRequest('POST', '/api/hrms/employees', {
          headers: authHeaders('HR Administrator'),
          body: tc.body
        });
        assert.equal(res.status, 400, `Expected 400 when missing ${tc.field}`);
        assert.equal(res.json().success, false);
      }
    });

    test('1.12 Foreign Key Validation: Non-existent department_id rejected with 400', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Fake',
          last_name: 'Dept',
          phone: '+234 803 333 0001',
          department_id: 'dept-non-existent-9999',
          designation_id: 'desig-tech-snr'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.json().error, /department .* not found/i);
    });

    test('1.13 Foreign Key Validation: Non-existent designation_id rejected with 400', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Fake',
          last_name: 'Desig',
          phone: '+234 803 333 0002',
          department_id: 'dept-tech',
          designation_id: 'desig-non-existent-9999'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.json().error, /designation .* not found/i);
    });

    test('1.14 SQL Injection Probes in onboarding fields: Parameterized SQL prevents injection', async () => {
      const sqliPayloads = [
        { first_name: "Robert'); DROP TABLE employees;--", last_name: "Injection1" },
        { first_name: "Injection2", last_name: "' OR '1'='1" },
        { first_name: "Injection3", last_name: "'; DELETE FROM audit_events;--" }
      ];

      for (let i = 0; i < sqliPayloads.length; i++) {
        const payload = sqliPayloads[i];
        const res = await apiRequest('POST', '/api/hrms/employees', {
          headers: authHeaders('HR Administrator'),
          body: {
            first_name: payload.first_name,
            last_name: payload.last_name,
            official_email: `${testEmailPrefix}.sqli${i}@adversarial-nexus.com`,
            phone: `+234 803 444 000${i}`,
            department_id: 'dept-tech',
            designation_id: 'desig-tech-snr',
            branch_location: "Marina'; UPDATE employees SET employment_status='Hacked';--"
          }
        });

        assert.equal(res.status, 201);
        const json = res.json();
        createdTestIds.push(json.employee.id);

        // Verify table was NOT dropped and query succeeded safely
        const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as any;
        assert.ok(empCount.count > 0, 'employees table must still exist');

        // Verify no unauthorized status was changed to 'Hacked'
        const hacked = db.prepare("SELECT COUNT(*) as count FROM employees WHERE employment_status = 'Hacked'").get() as any;
        assert.equal(hacked.count, 0, 'SQL injection must not execute malicious commands');

        // Verify payload was stored as literal text
        const inserted = db.prepare('SELECT first_name, branch_location FROM employees WHERE id = ?').get(json.employee.id) as any;
        assert.equal(inserted.first_name, payload.first_name);
        assert.ok(inserted.branch_location.includes("Marina'; UPDATE"));
      }
    });

    test('1.15 Long String Stress: 1,000+ character strings handled cleanly', async () => {
      const longName = 'A'.repeat(1000);
      const longBranch = 'B'.repeat(2000);
      const longPhone = '+234 ' + '9'.repeat(500);

      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: longName,
          last_name: 'LongStringTest',
          official_email: `${testEmailPrefix}.longstr@adversarial-nexus.com`,
          phone: longPhone,
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          branch_location: longBranch
        }
      });

      assert.equal(res.status, 201);
      const json = res.json();
      createdTestIds.push(json.employee.id);

      const dbEmp = db.prepare('SELECT first_name, branch_location FROM employees WHERE id = ?').get(json.employee.id) as any;
      assert.equal(dbEmp.first_name.length, 1000);
      assert.equal(dbEmp.branch_location.length, 2000);
    });

    test('1.16 Role Authorization: Regular Employee role rejected with 403', async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('Employee', 'Unauthorized Staff'),
        body: {
          first_name: 'Rogue',
          last_name: 'Employee',
          phone: '+234 803 555 0001',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr'
        }
      });

      assert.equal(res.status, 403);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /forbidden|cannot onboard/i);
    });
  });

  // =========================================================================
  // 2. GET /api/hrms/directory Adversarial Probes & Privacy Leaks
  // =========================================================================
  describe('2. GET /api/hrms/directory - Special Chars, Casing & Privacy Invariants', () => {
    test('2.1 Special character probe: % wildcard does not crash or break syntax', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=%', {
        headers: authHeaders('Employee')
      });

      assert.equal(res.status, 200);
      const json = res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.directory));
      assert.ok(json.directory.length > 0);
    });

    test('2.2 Special character probe: multiple wildcards %%%%%% safely executed', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=' + encodeURIComponent('%%%%%%'), {
        headers: authHeaders('Employee')
      });

      assert.equal(res.status, 200);
      const json = res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.directory));
    });

    test('2.3 Special character probe: single quote does not cause SQL syntax error', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=' + encodeURIComponent("O'Connor"), {
        headers: authHeaders('Employee')
      });

      assert.equal(res.status, 200);
      const json = res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.directory));
    });

    test('2.4 SQL injection probe in search parameter: safely parameterized', async () => {
      const sqliSearch = "' OR '1'='1' UNION SELECT * FROM employee_accounts--";
      const res = await apiRequest('GET', '/api/hrms/directory?search=' + encodeURIComponent(sqliSearch), {
        headers: authHeaders('Employee')
      });

      assert.equal(res.status, 200);
      const json = res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.directory));
    });

    test('2.5 Casing robustness: uppercase, lowercase, and mixed-case search match identically', async () => {
      const resUpper = await apiRequest('GET', '/api/hrms/directory?search=AMINA', { headers: authHeaders('Employee') });
      const resLower = await apiRequest('GET', '/api/hrms/directory?search=amina', { headers: authHeaders('Employee') });
      const resMixed = await apiRequest('GET', '/api/hrms/directory?search=aMiNa', { headers: authHeaders('Employee') });

      assert.equal(resUpper.status, 200);
      assert.equal(resLower.status, 200);
      assert.equal(resMixed.status, 200);

      const upperList = resUpper.json().directory;
      const lowerList = resLower.json().directory;
      const mixedList = resMixed.json().directory;

      assert.ok(upperList.some((e: any) => e.first_name.includes('Amina') && e.last_name === 'Bello'));
      assert.ok(lowerList.some((e: any) => e.first_name.includes('Amina') && e.last_name === 'Bello'));
      assert.ok(mixedList.some((e: any) => e.first_name.includes('Amina') && e.last_name === 'Bello'));
      assert.equal(upperList.length, lowerList.length);
      assert.equal(lowerList.length, mixedList.length);
    });

    test('2.6 Whitespace handling: search with padding spaces is trimmed and matches', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory?search=' + encodeURIComponent('   Amina   '), {
        headers: authHeaders('Employee')
      });

      assert.equal(res.status, 200);
      const list = res.json().directory;
      assert.ok(list.some((e: any) => e.first_name.includes('Amina') && e.last_name === 'Bello'));
    });

    test('2.7 SENSITIVE DATA PRIVACY AUDIT: Complete omission of sensitive columns across all records', async () => {
      const res = await apiRequest('GET', '/api/hrms/directory', {
        headers: authHeaders('Employee')
      });

      assert.equal(res.status, 200);
      const directory = res.json().directory;
      assert.ok(directory.length > 0, 'Directory should have active records');

      for (const entry of directory) {
        // Assert required public fields are present
        assert.ok(entry.id, 'id must be present');
        assert.ok(entry.employee_number, 'employee_number must be present');
        assert.ok(entry.first_name, 'first_name must be present');
        assert.ok(entry.last_name, 'last_name must be present');
        assert.ok(entry.official_email, 'official_email must be present');
        assert.ok(entry.employment_status, 'employment_status must be present');

        // STRICT ASSERTIONS: Sensitive fields MUST NOT exist in payload
        assert.equal(entry.salary_monthly, undefined, `Data leak: salary_monthly exposed for ${entry.id}`);
        assert.equal(entry.bank_name, undefined, `Data leak: bank_name exposed for ${entry.id}`);
        assert.equal(entry.bank_account_number, undefined, `Data leak: bank_account_number exposed for ${entry.id}`);
        assert.equal(entry.bvn_nin_masked, undefined, `Data leak: bvn_nin_masked exposed for ${entry.id}`);
        assert.equal(entry.personal_email, undefined, `Data leak: personal_email exposed for ${entry.id}`);
        assert.equal(entry.password_hash, undefined, `Data leak: password_hash exposed for ${entry.id}`);
        assert.equal(entry.emergency_contact_name, undefined, `Data leak: emergency_contact_name exposed for ${entry.id}`);
        assert.equal(entry.emergency_contact_phone, undefined, `Data leak: emergency_contact_phone exposed for ${entry.id}`);
        assert.equal(entry.emergency_contact_relationship, undefined, `Data leak: emergency_contact_relationship exposed for ${entry.id}`);
      }
    });

    test('2.8 Offboarded Isolation: Terminated/Inactive employees never appear in public directory', async () => {
      // Create an offboarded/terminated employee
      const testEmail = `${testEmailPrefix}.terminated@adversarial-nexus.com`;
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'TerminatedGhost',
          last_name: 'UserGhost',
          official_email: testEmail,
          phone: '+234 803 666 0001',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          employment_status: 'Terminated'
        }
      });
      assert.equal(res.status, 201);
      const empId = res.json().employee.id;
      createdTestIds.push(empId);

      // Query directory searching specifically for this terminated employee
      const dirRes = await apiRequest('GET', '/api/hrms/directory?search=' + encodeURIComponent('TerminatedGhost'), {
        headers: authHeaders('Employee')
      });
      assert.equal(dirRes.status, 200);
      const matches = dirRes.json().directory;
      assert.equal(matches.find((e: any) => e.id === empId), undefined, 'Terminated employee must NOT appear in directory');
    });
  });

  // =========================================================================
  // 3. PATCH /api/hrms/employees/:id Adversarial Probes
  // =========================================================================
  describe('3. PATCH /api/hrms/employees/:id - Status, Manager & Lifecycle Synchronization', () => {
    let lifecycleEmpId: string;
    const lifecycleEmail = `${testEmailPrefix}.lifecycle@adversarial-nexus.com`;
    const lifecyclePassword = 'LifecycleSecret2026!';

    before(async () => {
      const res = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Lifecycle',
          last_name: 'SyncCandidate',
          official_email: lifecycleEmail,
          phone: '+234 803 777 0001',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          salary_monthly: 500000,
          employment_status: 'Active',
          password: lifecyclePassword
        }
      });
      assert.equal(res.status, 201);
      lifecycleEmpId = res.json().employee.id;
      createdTestIds.push(lifecycleEmpId);
    });

    test('3.1 Invalid Status Value: AlienAbductedStatus rejected with 400', async () => {
      const res = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('HR Administrator'),
        body: { employment_status: 'AlienAbductedStatus' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /invalid employment_status/i);
    });

    test('3.2 Invalid Status Value: empty string rejected with 400', async () => {
      const res = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('HR Administrator'),
        body: { employment_status: '' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /invalid employment_status/i);
    });

    test('3.3 Circular self-reporting manager check: employee setting reporting_manager_id to own ID rejected with 400', async () => {
      const res = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('HR Administrator'),
        body: { reporting_manager_id: lifecycleEmpId }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /cannot report to themselves/i);
    });

    test('3.4 Offboarding Synchronization: setting status=Terminated deactivates account is_active=0 and blocks login', async () => {
      // 1. Verify initially can log in
      const preLogin = mockLogin({ username: lifecycleEmail, password: lifecyclePassword });
      assert.equal(preLogin.status, 200, 'Active employee should be able to log in');

      // 2. Offboard to Terminated
      const patchRes = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('HR Administrator'),
        body: { employment_status: 'Terminated' }
      });
      assert.equal(patchRes.status, 200);

      // 3. Verify SQLite DB synchronization
      const empDb = db.prepare('SELECT employment_status FROM employees WHERE id = ?').get(lifecycleEmpId) as any;
      assert.equal(empDb.employment_status, 'Terminated');

      const accDb = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(lifecycleEmpId) as any;
      assert.equal(accDb.is_active, 0, 'employee_accounts.is_active must be 0 after termination');

      // 4. Verify audit event logged
      const audit = db.prepare('SELECT * FROM audit_events WHERE entity_id = ? AND action = ?').get(lifecycleEmpId, 'employee_offboarding_status_changed') as any;
      assert.ok(audit, 'Audit event employee_offboarding_status_changed must be logged');

      // 5. Verify staff login is now BLOCKED with 403
      const postLogin = mockLogin({ username: lifecycleEmail, password: lifecyclePassword });
      assert.equal(postLogin.status, 403, 'Terminated employee login must be rejected with 403');
      assert.match(postLogin.body.error, /deactivated/i);
    });

    test('3.5 Offboarding Synchronization: setting status=Inactive, Suspended, or Resigned also keeps is_active=0', async () => {
      const offboardStatuses = ['Inactive', 'Suspended', 'Resigned'];

      for (const st of offboardStatuses) {
        const res = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
          headers: authHeaders('HR Administrator'),
          body: { employment_status: st }
        });
        assert.equal(res.status, 200);

        const acc = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(lifecycleEmpId) as any;
        assert.equal(acc.is_active, 0, `is_active must be 0 for status ${st}`);

        const login = mockLogin({ username: lifecycleEmail, password: lifecyclePassword });
        assert.equal(login.status, 403);
      }
    });

    test('3.6 Reactivation Synchronization: setting status=Active reactivates account is_active=1 and enables login', async () => {
      const reactivateRes = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('HR Administrator'),
        body: { employment_status: 'Active' }
      });
      assert.equal(reactivateRes.status, 200);

      // Verify SQLite synchronization
      const accDb = db.prepare('SELECT is_active FROM employee_accounts WHERE employee_id = ?').get(lifecycleEmpId) as any;
      assert.equal(accDb.is_active, 1, 'employee_accounts.is_active must be 1 after reactivation');

      // Verify audit event
      const audit = db.prepare('SELECT * FROM audit_events WHERE entity_id = ? AND action = ?').get(lifecycleEmpId, 'employee_status_reactivated') as any;
      assert.ok(audit, 'Audit event employee_status_reactivated must be logged');

      // Verify login succeeds again
      const login = mockLogin({ username: lifecycleEmail, password: lifecyclePassword });
      assert.equal(login.status, 200, 'Reactivated employee must be able to log in');
      assert.equal(login.body.success, true);
    });

    test('3.7 Role Authorization: Regular Employee role rejected with 403', async () => {
      const res = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('Employee', 'SelfService Staff'),
        body: { department_id: 'dept-exec' }
      });

      assert.equal(res.status, 403);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /forbidden|cannot modify/i);
    });

    test('3.8 Non-existent Employee ID returns 404', async () => {
      const res = await apiRequest('PATCH', '/api/hrms/employees/emp_does_not_exist_99999', {
        headers: authHeaders('HR Administrator'),
        body: { employment_status: 'Active' }
      });

      assert.equal(res.status, 404);
      assert.equal(res.json().success, false);
    });

    test('3.9 Negative salary in PATCH rejected with 400', async () => {
      const res = await apiRequest('PATCH', `/api/hrms/employees/${lifecycleEmpId}`, {
        headers: authHeaders('HR Administrator'),
        body: { salary_monthly: -50000 }
      });

      assert.equal(res.status, 400);
      assert.equal(res.json().success, false);
      assert.match(res.json().error, /cannot be negative/i);
    });
  });

  // =========================================================================
  // 4. GET /api/hrms/stats Empirical Accuracy & Date Comparison
  // =========================================================================
  describe('4. GET /api/hrms/stats - Analytical Headcount & Date Calculation Accuracy', () => {
    test('4.1 Stats API reflects genuine SQLite database counts', async () => {
      const res = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('HR Administrator')
      });

      assert.equal(res.status, 200);
      const json = res.json();
      assert.equal(json.success, true);
      const stats = json.stats;

      // Direct SQLite count verification
      const dbActive = db.prepare("SELECT COUNT(*) as c FROM employees WHERE employment_status = 'Active'").get() as any;
      const dbTotal = db.prepare("SELECT COUNT(*) as c FROM employees").get() as any;

      assert.equal(stats.activeHeadcount, dbActive.c);
      assert.equal(stats.totalHeadcount, dbTotal.c);

      // Verify department breakdown sums equal totals
      const sumActiveDepts = stats.departmentBreakdown.reduce((acc: number, d: any) => acc + d.activeHeadcount, 0);
      assert.equal(sumActiveDepts, stats.activeHeadcount, 'Sum of department active counts must equal activeHeadcount');
    });

    test('4.2 Headcount delta: inserting active employee increments active and total by 1', async () => {
      const beforeRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders('HR Administrator') });
      const beforeStats = beforeRes.json().stats;

      // Onboard active employee
      const onboardRes = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'StatProbe',
          last_name: 'ActiveUser',
          official_email: `${testEmailPrefix}.statactive@adversarial-nexus.com`,
          phone: '+234 803 888 0001',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          employment_status: 'Active'
        }
      });
      assert.equal(onboardRes.status, 201);
      const empId = onboardRes.json().employee.id;
      createdTestIds.push(empId);

      const afterRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders('HR Administrator') });
      const afterStats = afterRes.json().stats;

      assert.equal(afterStats.activeHeadcount, beforeStats.activeHeadcount + 1);
      assert.equal(afterStats.totalHeadcount, beforeStats.totalHeadcount + 1);
    });

    test('4.3 Date Comparison: newlyOnboardedThisMonth accurately compares joining date against current month', async () => {
      const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
      const todayIso = new Date().toISOString().split('T')[0];

      const beforeRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders('HR Administrator') });
      const beforeNewThisMonth = beforeRes.json().stats.newlyOnboardedThisMonth;

      // 1. Onboard employee joining TODAY (current month)
      const empTodayRes = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Joined',
          last_name: 'Today',
          official_email: `${testEmailPrefix}.joinedtoday@adversarial-nexus.com`,
          phone: '+234 803 888 0002',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          date_of_joining: todayIso
        }
      });
      assert.equal(empTodayRes.status, 201);
      createdTestIds.push(empTodayRes.json().employee.id);

      const midRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders('HR Administrator') });
      assert.equal(midRes.json().stats.newlyOnboardedThisMonth, beforeNewThisMonth + 1, 'Today onboarding must increment newlyOnboardedThisMonth');

      // 2. Onboard employee joining in the PAST (last year: 2024-01-15)
      const empPastRes = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Joined',
          last_name: 'LastYear',
          official_email: `${testEmailPrefix}.joinedpast@adversarial-nexus.com`,
          phone: '+234 803 888 0003',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          date_of_joining: '2024-01-15'
        }
      });
      assert.equal(empPastRes.status, 201);
      createdTestIds.push(empPastRes.json().employee.id);

      const pastCheckRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders('HR Administrator') });
      assert.equal(pastCheckRes.json().stats.newlyOnboardedThisMonth, beforeNewThisMonth + 1, 'Past year hire must NOT increment newlyOnboardedThisMonth');

      // 3. Onboard employee joining in the FUTURE (next year: 2027-01-15)
      const empFutureRes = await apiRequest('POST', '/api/hrms/employees', {
        headers: authHeaders('HR Administrator'),
        body: {
          first_name: 'Joined',
          last_name: 'FutureYear',
          official_email: `${testEmailPrefix}.joinedfuture@adversarial-nexus.com`,
          phone: '+234 803 888 0004',
          department_id: 'dept-tech',
          designation_id: 'desig-tech-snr',
          date_of_joining: '2027-01-15'
        }
      });
      assert.equal(empFutureRes.status, 201);
      createdTestIds.push(empFutureRes.json().employee.id);

      const futureCheckRes = await apiRequest('GET', '/api/hrms/stats', { headers: authHeaders('HR Administrator') });
      assert.equal(futureCheckRes.json().stats.newlyOnboardedThisMonth, beforeNewThisMonth + 1, 'Future hire must NOT increment newlyOnboardedThisMonth');
    });

    test('4.4 Role Authorization: AnonymousUser gets 401, Employee gets 403, HR Admin gets 200', async () => {
      // Anonymous
      const anonRes = await apiRequest('GET', '/api/hrms/stats', {
        headers: { 'x-nexus-role': 'AnonymousUser' }
      });
      assert.equal(anonRes.status, 401);

      // Employee
      const empRes = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('Employee')
      });
      assert.equal(empRes.status, 403);

      // HR Administrator
      const adminRes = await apiRequest('GET', '/api/hrms/stats', {
        headers: authHeaders('HR Administrator')
      });
      assert.equal(adminRes.status, 200);
      assert.equal(adminRes.json().success, true);
    });
  });
});

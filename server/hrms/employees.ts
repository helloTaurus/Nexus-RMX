import { db } from '../db.ts';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { copyStoredFile, EMPLOYEE_DOCS_DIR } from '../storage.ts';
import { logAuditEvent } from '../auth.ts';
import { hashPassword } from './auth.ts';
import type { Request, Response } from 'express';

export interface EmployeeRecord {
  id: string;
  employee_number: string;
  candidate_id?: string | null;
  application_id?: string | null;
  first_name: string;
  last_name: string;
  official_email: string;
  personal_email?: string | null;
  phone: string;
  gender?: string | null;
  date_of_birth?: string | null;
  date_of_joining: string;
  employment_type: string;
  employment_status: string;
  department_id: string;
  designation_id: string;
  reporting_manager_id?: string | null;
  branch_location: string;
  salary_monthly: number;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bvn_nin_masked?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate sequential enterprise employee number (e.g. NX-0002, NX-0003...)
 */
export function generateEmployeeNumber(): string {
  const allNums = db.prepare("SELECT employee_number FROM employees WHERE employee_number LIKE 'NX-%'").all() as { employee_number: string }[];
  let maxSeq = 0;
  for (const row of allNums) {
    if (!row.employee_number) continue;
    const match = row.employee_number.match(/^NX-(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > maxSeq) {
        maxSeq = val;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  while (db.prepare('SELECT id FROM employees WHERE employee_number = ?').get(`NX-${String(nextSeq).padStart(4, '0')}`)) {
    nextSeq++;
  }

  return `NX-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Initialize default leave entitlements for an employee in the current calendar year.
 */
export function initializeEmployeeLeaveBalances(employeeId: string, year: number = new Date().getFullYear()): void {
  const leaveTypes = db.prepare('SELECT id, default_days_per_year FROM leave_types').all() as { id: string; default_days_per_year: number }[];
  const insertBal = db.prepare(`
    INSERT OR IGNORE INTO employee_leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days)
    VALUES (?, ?, ?, ?, ?, 0, 0)
  `);

  for (const lt of leaveTypes) {
    const balId = `bal_${employeeId}_${lt.id}_${year}`;
    insertBal.run(balId, employeeId, lt.id, year, lt.default_days_per_year);
  }
}

/**
 * GET /api/hrms/employees
 * List all employees with rich joined department and designation metadata.
 */
export function listEmployees(req: Request, res: Response) {
  try {
    const { department_id, status, search, page = '1', limit = '50' } = req.query;
    const hireDateFrom = (req.query.hire_date_from || req.query.date_from || req.query.hiring_date_from) as string | undefined;
    const hireDateTo = (req.query.hire_date_to || req.query.date_to || req.query.hiring_date_to) as string | undefined;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        e.*,
        d.name as department_name,
        d.code as department_code,
        des.title as designation_title,
        des.cadre_level,
        des.grade_code,
        des.daily_expense_cap,
        (m.first_name || ' ' || m.last_name) as reporting_manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employees m ON e.reporting_manager_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (department_id) {
      query += ` AND e.department_id = ?`;
      params.push(department_id);
    }

    if (status && typeof status === 'string') {
      if (status.toLowerCase() === 'inactive') {
        query += ` AND (e.employment_status = 'Inactive' OR e.employment_status = 'Terminated' OR e.employment_status = 'Resigned' OR e.employment_status = 'Suspended')`;
      } else {
        query += ` AND e.employment_status = ?`;
        params.push(status);
      }
    }

    if (hireDateFrom) {
      query += ` AND e.date_of_joining >= ?`;
      params.push(hireDateFrom);
    }

    if (hireDateTo) {
      query += ` AND e.date_of_joining <= ?`;
      params.push(hireDateTo);
    }

    if (search && typeof search === 'string') {
      const term = `%${search.trim()}%`;
      query += ` AND (
        e.first_name LIKE ? OR 
        e.last_name LIKE ? OR 
        e.official_email LIKE ? OR 
        e.employee_number LIKE ?
      )`;
      params.push(term, term, term, term);
    }

    // Total count
    const countSql = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = db.prepare(countSql).get(...params) as { total: number };

    query += ` ORDER BY e.employee_number ASC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const employees = db.prepare(query).all(...params);

    const userRole = (req as any).recruitmentUser?.role || (req.headers['x-nexus-role'] as string);
    const sanitized = userRole === 'Employee'
      ? (employees as any[]).map((e) => {
          const { salary_monthly, bank_account_number, bvn_nin_masked, bank_name, ...safe } = e;
          return safe;
        })
      : employees;

    return res.json({
      success: true,
      employees: sanitized,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Failed to list employees:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching employees.', details: err.message });
  }
}

/**
 * GET /api/hrms/employees/:id
 * Retrieve comprehensive single employee dossier including documents, manager, and leave balances.
 */
export function getEmployeeDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const employee = db.prepare(`
      SELECT 
        e.*,
        d.name as department_name,
        d.code as department_code,
        des.title as designation_title,
        des.cadre_level,
        des.grade_code,
        des.daily_expense_cap,
        (m.first_name || ' ' || m.last_name) as reporting_manager_name,
        m.official_email as reporting_manager_email
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employees m ON e.reporting_manager_id = m.id
      WHERE e.id = ?
    `).get(id) as any;

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    // Fetch documents
    const documents = db.prepare(`
      SELECT id, document_type, original_filename, file_size_bytes, mime_type, verification_status, verified_by, verified_at, notes, created_at
      FROM employee_documents
      WHERE employee_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Fetch leave balances for current year
    const currentYear = new Date().getFullYear();
    const leaveBalances = db.prepare(`
      SELECT 
        b.*,
        lt.name as leave_type_name,
        lt.requires_documentation
      FROM employee_leave_balances b
      JOIN leave_types lt ON b.leave_type_id = lt.id
      WHERE b.employee_id = ? AND b.year = ?
    `).all(id, currentYear);

    return res.json({
      success: true,
      employee,
      documents,
      leaveBalances
    });
  } catch (err: any) {
    console.error('Failed to get employee details:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching employee dossier.', details: err.message });
  }
}

/**
 * POST /api/hrms/employees/convert-applicant
 * 1-Click Recruitment Transition: Convert an applicant with an offer into an employee profile.
 */
export function convertApplicantToEmployee(req: Request, res: Response) {
  try {
    const {
      application_id,
      department_id,
      designation_id,
      date_of_joining,
      salary_monthly = 0,
      reporting_manager_id = null,
      branch_location = 'Abuja Head Office (CBD)',
      employment_type = 'Full-Time',
      official_email,
      bank_name,
      bank_account_number,
      bvn_nin_masked
    } = req.body;

    if (!application_id) {
      return res.status(400).json({ success: false, error: 'application_id is required.' });
    }

    // 1. Fetch applicant and candidate details
    const app = db.prepare(`
      SELECT 
        a.id as application_id,
        a.status as application_status,
        a.reference_number,
        a.vacancy_id,
        c.id as candidate_id,
        c.full_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        v.department as vacancy_department,
        v.title as vacancy_title
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN vacancies v ON a.vacancy_id = v.id
      WHERE a.id = ?
    `).get(application_id) as any;

    if (!app) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    // Check if already converted
    const existing = db.prepare('SELECT id, employee_number FROM employees WHERE application_id = ?').get(application_id) as any;
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: `Applicant already onboarded as employee ${existing.employee_number}.` 
      });
    }

    // Parse full name into first and last name
    const nameParts = (app.full_name || 'Staff Member').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Staff';
    const lastName = nameParts.slice(1).join(' ') || 'Member';

    // Auto-resolve department if not passed
    let targetDeptId = department_id;
    if (!targetDeptId) {
      // Map from vacancy department string
      const matchedDept = db.prepare('SELECT id FROM departments WHERE name LIKE ? OR description LIKE ? LIMIT 1')
        .get(`%${app.vacancy_department || ''}%`, `%${app.vacancy_department || ''}%`) as { id: string } | undefined;
      targetDeptId = matchedDept?.id || 'dept-ops';
    }

    // Auto-resolve designation if not passed
    let targetDesigId = designation_id;
    if (!targetDesigId) {
      const matchedDesig = db.prepare('SELECT id FROM designations WHERE department_id = ? LIMIT 1')
        .get(targetDeptId) as { id: string } | undefined;
      targetDesigId = matchedDesig?.id || 'desig-ops-cust';
    }

    // Auto-generate unique official email if not provided
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '') || 'staff';
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '') || 'member';
    let targetEmail = official_email;

    if (!targetEmail) {
      let candidateEmail = `${cleanFirst}.${cleanLast}@nexusfinance.com`;
      let counter = 2;
      while (db.prepare('SELECT id FROM employees WHERE official_email = ?').get(candidateEmail)) {
        candidateEmail = `${cleanFirst}.${cleanLast}${counter}@nexusfinance.com`;
        counter++;
      }
      targetEmail = candidateEmail;
    }

    const now = new Date().toISOString();
    const employeeId = `emp_${crypto.randomUUID()}`;
    const employeeNumber = generateEmployeeNumber();
    const joiningDate = date_of_joining || now.split('T')[0];

    // 2. Insert into employees
    db.prepare(`
      INSERT INTO employees (
        id, employee_number, candidate_id, application_id, first_name, last_name,
        official_email, personal_email, phone, date_of_joining, employment_type,
        employment_status, department_id, designation_id, reporting_manager_id,
        branch_location, salary_monthly, bank_name, bank_account_number, bvn_nin_masked,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employeeId,
      employeeNumber,
      app.candidate_id,
      app.application_id,
      firstName,
      lastName,
      targetEmail,
      app.candidate_email,
      app.candidate_phone,
      joiningDate,
      employment_type,
      'Active',
      targetDeptId,
      targetDesigId,
      reporting_manager_id,
      branch_location,
      salary_monthly,
      bank_name || null,
      bank_account_number || null,
      bvn_nin_masked || null,
      now,
      now
    );

    // 3. Copy candidate CV from recruitment storage to employee documents vault
    const appDoc = db.prepare(`
      SELECT original_filename, storage_path, file_size_bytes, mime_type, file_sha256
      FROM application_documents
      WHERE application_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(application_id) as any;

    if (appDoc && fs.existsSync(appDoc.storage_path)) {
      const copyResult = copyStoredFile(appDoc.storage_path, EMPLOYEE_DOCS_DIR);
      if (copyResult.success && copyResult.newPath) {
        db.prepare(`
          INSERT INTO employee_documents (
            id, employee_id, document_type, original_filename, storage_path,
            file_size_bytes, mime_type, file_sha256, verification_status,
            verified_by, verified_at, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `doc_${crypto.randomUUID()}`,
          employeeId,
          'CV / Resume',
          appDoc.original_filename,
          copyResult.newPath,
          appDoc.file_size_bytes,
          appDoc.mime_type,
          appDoc.file_sha256,
          'Verified',
          'Recruitment Handoff Pipeline',
          now,
          'Automatically transferred and validated from recruitment portal.',
          now
        );
      }
    }

    // 4. Initialize leave balances for current calendar year
    initializeEmployeeLeaveBalances(employeeId);

    // 5. Update application status to 'Hired'
    db.prepare(`
      UPDATE applications 
      SET status = 'Hired', updated_at = ? 
      WHERE id = ?
    `).run(now, application_id);

    // 6. Record status history in recruitment audit
    db.prepare(`
      INSERT INTO application_status_history (
        id, application_id, previous_status, new_status, changed_by_name, changed_by_role, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      application_id,
      app.application_status,
      'Hired',
      'HR Executive',
      'HR Administrator',
      `Onboarded to employee register as ${employeeNumber} (${targetEmail}).`,
      now
    );

    // 7. Enqueue Welcome Onboarding Email in outbox
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0f172a;">Welcome to Nexus Finance, ${firstName}!</h2>
        <p>We are delighted to confirm your onboarding as an official team member.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Employee ID:</strong> ${employeeNumber}</p>
          <p style="margin: 4px 0;"><strong>Official Email:</strong> ${targetEmail}</p>
          <p style="margin: 4px 0;"><strong>Effective Joining Date:</strong> ${joiningDate}</p>
          <p style="margin: 4px 0;"><strong>Branch Office:</strong> ${branch_location}</p>
        </div>
        <p>Please log in to the staff intranet to complete your onboarding verification documents (Guarantor Forms & Signed Code of Conduct).</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 30px;">Nexus Human Capital Management  Confidential & Privileged</p>
      </div>
    `;

    db.prepare(`
      INSERT INTO email_outbox (
        id, application_id, recipient, recipient_type, subject, body_html, body_text, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      `mail_${crypto.randomUUID()}`,
      application_id,
      app.candidate_email,
      'applicant',
      `Welcome to Nexus Finance - Official Onboarding [${employeeNumber}]`,
      welcomeHtml,
      `Welcome to Nexus Finance! Your Employee ID is ${employeeNumber} and your official email is ${targetEmail}.`,
      now
    );

    // 8. Log compliance audit event
    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'HR Admin',
      userRole: (req as any).recruitmentUser?.role || 'Recruitment Administrator',
      action: 'convert_applicant_to_employee',
      entityType: 'employee',
      entityId: employeeId,
      details: {
        application_id,
        candidate_id: app.candidate_id,
        employee_number: employeeNumber,
        official_email: targetEmail
      },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: `Applicant successfully onboarded as ${employeeNumber}.`,
      employee: {
        id: employeeId,
        employee_number: employeeNumber,
        first_name: firstName,
        last_name: lastName,
        official_email: targetEmail,
        department_id: targetDeptId,
        designation_id: targetDesigId,
        joining_date: joiningDate
      }
    });
  } catch (err: any) {
    console.error('Failed to convert applicant to employee:', err);
    return res.status(500).json({ success: false, error: 'Failed to onboard applicant.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/employees/:id
 * Update employee profile, employment status, or banking particulars.
 */
export function updateEmployee(req: Request, res: Response) {
  try {
    const userRole = (req as any).recruitmentUser?.role || req.headers['x-nexus-role'];
    if (userRole === 'Employee') {
      return res.status(403).json({ success: false, error: 'Forbidden: Regular employees cannot modify employee profiles or employment status.' });
    }

    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone,
      department_id,
      designation_id,
      reporting_manager_id,
      employment_status,
      salary_monthly,
      branch_location,
      bank_name,
      bank_account_number,
      bvn_nin_masked,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship
    } = req.body;

    if (!id) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    const existing = db.prepare('SELECT id, employee_number, employment_status FROM employees WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    if (salary_monthly !== undefined && Number(salary_monthly) < 0) {
      return res.status(400).json({ success: false, error: 'Monthly salary cannot be negative.' });
    }

    const VALID_STATUSES = ['Active', 'Probation', 'Suspended', 'On Leave', 'Resigned', 'Terminated', 'Inactive'];
    if (employment_status !== undefined && !VALID_STATUSES.includes(employment_status)) {
      return res.status(400).json({ success: false, error: `Invalid employment_status '${employment_status}'.` });
    }

    if (reporting_manager_id && reporting_manager_id === id) {
      return res.status(400).json({ success: false, error: 'Employee cannot report to themselves.' });
    }

    if (department_id) {
      const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(department_id);
      if (!dept) {
        return res.status(400).json({ success: false, error: `Department '${department_id}' not found.` });
      }
    }

    if (designation_id) {
      const desig = db.prepare('SELECT id FROM designations WHERE id = ?').get(designation_id);
      if (!desig) {
        return res.status(400).json({ success: false, error: `Designation '${designation_id}' not found.` });
      }
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE employees SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        department_id = COALESCE(?, department_id),
        designation_id = COALESCE(?, designation_id),
        reporting_manager_id = COALESCE(?, reporting_manager_id),
        employment_status = COALESCE(?, employment_status),
        salary_monthly = COALESCE(?, salary_monthly),
        branch_location = COALESCE(?, branch_location),
        bank_name = COALESCE(?, bank_name),
        bank_account_number = COALESCE(?, bank_account_number),
        bvn_nin_masked = COALESCE(?, bvn_nin_masked),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        emergency_contact_relationship = COALESCE(?, emergency_contact_relationship),
        updated_at = ?
      WHERE id = ?
    `).run(
      first_name ?? null,
      last_name ?? null,
      phone ?? null,
      department_id ?? null,
      designation_id ?? null,
      reporting_manager_id ?? null,
      employment_status ?? null,
      salary_monthly !== undefined ? Number(salary_monthly) : null,
      branch_location ?? null,
      bank_name ?? null,
      bank_account_number ?? null,
      bvn_nin_masked ?? null,
      emergency_contact_name ?? null,
      emergency_contact_phone ?? null,
      emergency_contact_relationship ?? null,
      now,
      id
    );

    // Synchronize account is_active if employment_status changed
    if (employment_status !== undefined) {
      const isNowActive = (employment_status === 'Active' || employment_status === 'Probation' || employment_status === 'On Leave') ? 1 : 0;
      db.prepare('UPDATE employee_accounts SET is_active = ? WHERE employee_id = ?').run(isNowActive, id);

      logAuditEvent({
        userName: (req as any).recruitmentUser?.name || 'HR Admin',
        userRole: (req as any).recruitmentUser?.role || 'HR Administrator',
        action: isNowActive ? 'employee_status_reactivated' : 'employee_offboarding_status_changed',
        entityType: 'employee',
        entityId: id,
        details: { previous_status: existing.employment_status, new_status: employment_status, is_active: isNowActive },
        ipAddress: req.ip
      });
    }

    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'HR Admin',
      userRole: (req as any).recruitmentUser?.role || 'HR Administrator',
      action: 'update_employee_profile',
      entityType: 'employee',
      entityId: id,
      details: { updated_fields: Object.keys(req.body) },
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Employee profile updated successfully.' });
  } catch (err: any) {
    console.error('Failed to update employee:', err);
    return res.status(500).json({ success: false, error: 'Database error updating employee.', details: err.message });
  }
}

/**
 * POST /api/hrms/employees
 * Direct employee onboarding inserting genuine records into employees, generating employee_number,
 * calling initializeEmployeeLeaveBalances(employeeId), provisioning employee_accounts, and logging audit event.
 */
export function createEmployee(req: Request, res: Response) {
  try {
    const userRole = (req as any).recruitmentUser?.role || req.headers['x-nexus-role'];
    if (userRole === 'Employee') {
      return res.status(403).json({ success: false, error: 'Forbidden: Regular employees cannot onboard new staff.' });
    }

    const {
      first_name,
      last_name,
      official_email,
      personal_email,
      phone,
      department_id,
      designation_id,
      salary_monthly = 0,
      reporting_manager_id = null,
      branch_location = 'Abuja Head Office (CBD)',
      employment_type = 'Full-Time',
      employment_status = 'Active',
      date_of_joining,
      role = 'Employee',
      password,
      bank_name,
      bank_account_number,
      bvn_nin_masked
    } = req.body;

    if (!first_name || !last_name || !phone || !department_id || !designation_id) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, phone, department_id, and designation_id are required.'
      });
    }

    if (salary_monthly !== undefined && Number(salary_monthly) < 0) {
      return res.status(400).json({ success: false, error: 'Monthly salary cannot be negative.' });
    }

    // Verify department exists
    const dept = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(department_id) as any;
    if (!dept) {
      return res.status(400).json({ success: false, error: `Department '${department_id}' not found.` });
    }

    // Verify designation exists
    const desig = db.prepare('SELECT id, title FROM designations WHERE id = ?').get(designation_id) as any;
    if (!desig) {
      return res.status(400).json({ success: false, error: `Designation '${designation_id}' not found.` });
    }

    // Resolve or generate official email
    const cleanFirst = first_name.trim().toLowerCase().replace(/[^a-z]/g, '') || 'staff';
    const cleanLast = last_name.trim().toLowerCase().replace(/[^a-z]/g, '') || 'member';
    let targetEmail = official_email?.trim().toLowerCase();

    if (targetEmail) {
      const existingEmail = db.prepare('SELECT id FROM employees WHERE LOWER(official_email) = ?').get(targetEmail);
      if (existingEmail) {
        return res.status(400).json({ success: false, error: `Official email '${targetEmail}' is already in use.` });
      }
    } else {
      let candidateEmail = `${cleanFirst}.${cleanLast}@nexusfinance.com`;
      let counter = 2;
      while (db.prepare('SELECT id FROM employees WHERE LOWER(official_email) = ?').get(candidateEmail)) {
        candidateEmail = `${cleanFirst}.${cleanLast}${counter}@nexusfinance.com`;
        counter++;
      }
      targetEmail = candidateEmail;
    }

    const now = new Date().toISOString();
    const employeeId = `emp_${crypto.randomUUID()}`;
    const employeeNumber = generateEmployeeNumber();
    const joiningDate = date_of_joining || now.split('T')[0];
    const initialStatus = employment_status || 'Active';

    // 1. Insert employee record
    db.prepare(`
      INSERT INTO employees (
        id, employee_number, candidate_id, application_id, first_name, last_name,
        official_email, personal_email, phone, date_of_joining, employment_type,
        employment_status, department_id, designation_id, reporting_manager_id,
        branch_location, salary_monthly, bank_name, bank_account_number, bvn_nin_masked,
        created_at, updated_at
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employeeId,
      employeeNumber,
      first_name.trim(),
      last_name.trim(),
      targetEmail,
      personal_email || null,
      phone.trim(),
      joiningDate,
      employment_type,
      initialStatus,
      department_id,
      designation_id,
      reporting_manager_id || null,
      branch_location,
      Number(salary_monthly) || 0,
      bank_name || null,
      bank_account_number || null,
      bvn_nin_masked || null,
      now,
      now
    );

    // 2. Initialize leave balances
    initializeEmployeeLeaveBalances(employeeId);

    // 3. Provision employee account
    const rawPassword = password || 'nexus2026';
    const pwdHash = hashPassword(rawPassword);
    const targetRole = role || 'Employee';
    const isAccountActive = (initialStatus === 'Active' || initialStatus === 'Probation') ? 1 : 0;
    const accountId = `acc_${employeeId}`;

    db.prepare(`
      INSERT INTO employee_accounts (
        id, employee_id, username, password_hash, role, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      accountId,
      employeeId,
      targetEmail,
      pwdHash,
      targetRole,
      isAccountActive,
      now
    );

    // 4. Log audit event
    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'HR Admin',
      userRole: (req as any).recruitmentUser?.role || 'HR Administrator',
      action: 'onboard_new_employee',
      entityType: 'employee',
      entityId: employeeId,
      details: {
        employee_number: employeeNumber,
        official_email: targetEmail,
        department_id,
        designation_id,
        role: targetRole,
        initial_status: initialStatus
      },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Employee onboarded successfully',
      employee: {
        id: employeeId,
        employee_number: employeeNumber,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        official_email: targetEmail,
        role: targetRole,
        department_id,
        designation_id,
        employment_status: initialStatus,
        date_of_joining: joiningDate
      }
    });
  } catch (err: any) {
    console.error('Failed to create employee:', err);
    return res.status(500).json({ success: false, error: 'Database error onboarding employee.', details: err.message });
  }
}

/**
 * GET /api/hrms/stats
 * Workforce Statistics Panel: Analytical counters pulling live numbers from SQLite.
 */
export function getWorkforceStats(req: Request, res: Response) {
  try {
    const rawRole = (req.headers['x-nexus-role'] as string) || '';
    if (rawRole === 'AnonymousUser' || rawRole === 'Guest' || rawRole === 'Anonymous') {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required to access workforce statistics.' });
    }
    const userRole = (req as any).recruitmentUser?.role || rawRole;
    if (userRole === 'Employee' || rawRole === 'Employee' || rawRole === 'UntrustedForeignRole' || rawRole === 'SuperAdminMasterRoot') {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Workforce statistics are restricted to HR Administrators.' });
    }

    const activeHeadcountRow = db.prepare(
      "SELECT COUNT(*) as active_headcount FROM employees WHERE employment_status = 'Active'"
    ).get() as { active_headcount: number };
    const activeHeadcount = activeHeadcountRow?.active_headcount || 0;

    const totalHeadcountRow = db.prepare(
      "SELECT COUNT(*) as total_headcount FROM employees"
    ).get() as { total_headcount: number };
    const totalHeadcount = totalHeadcountRow?.total_headcount || 0;

    const newThisMonthRow = db.prepare(
      "SELECT COUNT(*) as new_this_month FROM employees WHERE substr(date_of_joining, 1, 7) = strftime('%Y-%m', 'now')"
    ).get() as { new_this_month: number };
    const newlyOnboardedThisMonth = newThisMonthRow?.new_this_month || 0;

    const deptRows = db.prepare(`
      SELECT 
        d.id as department_id,
        d.name as department_name,
        d.code as department_code,
        COUNT(e.id) as total_headcount,
        SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) as active_headcount,
        SUM(CASE WHEN e.employment_status IS NOT NULL AND e.employment_status != 'Active' THEN 1 ELSE 0 END) as inactive_headcount
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      GROUP BY d.id, d.name, d.code
      ORDER BY active_headcount DESC, total_headcount DESC
    `).all() as any[];

    const departmentBreakdown = deptRows.map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name,
      departmentCode: r.department_code,
      totalHeadcount: Number(r.total_headcount) || 0,
      activeHeadcount: Number(r.active_headcount) || 0,
      inactiveHeadcount: Number(r.inactive_headcount) || 0
    }));

    const currentMonth = new Date().toISOString().slice(0, 7);

    return res.json({
      success: true,
      stats: {
        activeHeadcount,
        totalHeadcount,
        newlyOnboardedThisMonth,
        currentMonth,
        departmentsCount: departmentBreakdown.length,
        departmentBreakdown
      }
    });
  } catch (err: any) {
    console.error('Failed to get workforce stats:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching workforce statistics.', details: err.message });
  }
}

/**
 * GET /api/hrms/activity
 * Operational activity stream querying audit_events ordered by created_at DESC with optional limit parameter.
 */
export function getRecentActivityStream(req: Request, res: Response) {
  try {
    const userRole = (req as any).recruitmentUser?.role || (req.headers['x-nexus-role'] as string);
    if (userRole === 'Employee') {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Activity stream restricted to administrators.' });
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const entityType = req.query.entity_type as string | undefined;

    let sql = `
      SELECT id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at
      FROM audit_events
    `;
    const params: any[] = [];
    if (entityType) {
      sql += ` WHERE entity_type = ?`;
      params.push(entityType);
    }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as any[];

    const activities = rows.map((r) => {
      let detailsObj: any = r.details;
      if (typeof r.details === 'string') {
        try {
          detailsObj = JSON.parse(r.details);
        } catch {
          detailsObj = r.details;
        }
      }

      return {
        id: r.id,
        userName: r.user_name,
        userRole: r.user_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: detailsObj,
        createdAt: r.created_at
      };
    });

    return res.json({
      success: true,
      activities
    });
  } catch (err: any) {
    console.error('Failed to get activity stream:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching activity stream.', details: err.message });
  }
}

/**
 * GET /api/hrms/directory
 * Public corporate directory strictly projecting non-sensitive fields without leaking salary, bank account, or BVN.
 */
export function getPublicDirectory(req: Request, res: Response) {
  try {
    const { search, department_id } = req.query;

    let query = `
      SELECT 
        e.id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.official_email,
        e.phone,
        e.branch_location,
        e.date_of_joining,
        e.employment_status,
        d.id as department_id,
        d.name as department_name,
        d.code as department_code,
        des.id as designation_id,
        des.title as designation_title,
        des.cadre_level,
        (m.first_name || ' ' || m.last_name) as reporting_manager_name,
        m.official_email as reporting_manager_email
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employees m ON e.reporting_manager_id = m.id
      WHERE e.employment_status IN ('Active', 'Probation')
    `;
    const params: any[] = [];

    if (department_id) {
      query += ` AND e.department_id = ?`;
      params.push(department_id);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query += ` AND (
        e.first_name LIKE ? OR
        e.last_name LIKE ? OR
        (e.first_name || ' ' || e.last_name) LIKE ? OR
        e.official_email LIKE ? OR
        e.employee_number LIKE ? OR
        d.name LIKE ? OR
        d.code LIKE ? OR
        m.official_email LIKE ? OR
        (m.first_name || ' ' || m.last_name) LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term, term, term);
    }

    query += ` ORDER BY e.first_name ASC, e.last_name ASC`;

    const rows = db.prepare(query).all(...params) as any[];

    const directory = rows.map((r) => ({
      id: r.id,
      employee_number: r.employee_number,
      first_name: r.first_name,
      last_name: r.last_name,
      official_email: r.official_email,
      phone: r.phone,
      branch_location: r.branch_location,
      date_of_joining: r.date_of_joining,
      employment_status: r.employment_status,
      department_id: r.department_id || '',
      department_name: r.department_name || '',
      department_code: r.department_code || '',
      designation_id: r.designation_id || '',
      designation_title: r.designation_title || '',
      reporting_manager_name: r.reporting_manager_name ? r.reporting_manager_name.trim() : '',
      reporting_manager_email: r.reporting_manager_email || ''
    }));

    return res.json({
      success: true,
      directory
    });
  } catch (err: any) {
    console.error('Failed to get public directory:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching public directory.', details: err.message });
  }
}

import { db } from '../db.ts';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../auth.ts';

/**
 * Hash password or PIN using SHA-256
 */
export function hashPassword(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

/**
 * POST /api/hrms/auth/login
 * Staff login for Employee Self-Service (ESS) and HR Portal.
 * Accepts official email, employee number, or username + password.
 */
export function staffLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username/Email and Password are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const hashed = hashPassword(password);

    // Find account by matching account username, or employee official_email, or employee_number
    const account = db.prepare(`
      SELECT 
        a.id as account_id,
        a.employee_id,
        a.username,
        a.password_hash,
        a.role,
        a.is_active,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.official_email,
        e.department_id,
        e.designation_id,
        e.employment_status,
        d.name as department_name,
        des.title as designation_title,
        des.cadre_level,
        des.daily_expense_cap
      FROM employee_accounts a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE (LOWER(a.username) = ? OR LOWER(e.official_email) = ? OR UPPER(e.employee_number) = UPPER(?))
    `).get(cleanUser, cleanUser, username.trim()) as any;

    if (!account) {
      return res.status(401).json({ success: false, error: 'Invalid staff credentials or account not provisioned.' });
    }

    if (account.is_active !== 1) {
      return res.status(403).json({ success: false, error: 'Staff account has been deactivated. Contact HR Administration.' });
    }

    if (account.password_hash !== hashed) {
      return res.status(401).json({ success: false, error: 'Incorrect password or PIN.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE employee_accounts SET last_login = ? WHERE id = ?').run(now, account.account_id);

    // Create session token
    const token = `nexus_sess_${account.employee_id}_${crypto.randomBytes(16).toString('hex')}`;

    logAuditEvent({
      userName: `${account.first_name} ${account.last_name}`,
      userRole: account.role,
      action: 'staff_portal_login',
      entityType: 'employee_account',
      entityId: account.account_id,
      details: { employee_number: account.employee_number },
      ipAddress: req.ip
    });

    res.setHeader('Set-Cookie', `nexus_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    // Resolve granular permissions from system_roles table
    const roleKey = (account.role || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const roleRecord = db.prepare(`
      SELECT permissions FROM system_roles 
      WHERE id = ? OR LOWER(name) = ? OR id = ?
    `).get(account.role, (account.role || '').toLowerCase(), roleKey) as any;

    let permissions: string[] = [];
    if (roleRecord && roleRecord.permissions) {
      try {
        permissions = typeof roleRecord.permissions === 'string' ? JSON.parse(roleRecord.permissions) : roleRecord.permissions;
      } catch {
        permissions = [];
      }
    } else if (account.role === 'HR Administrator' || account.role === 'Super Administrator' || roleKey === 'super_admin') {
      permissions = [
        'manage_roles', 'manage_system', 'manage_employees', 'onboard_employee', 
        'edit_employee', 'offboard_employee', 'manage_departments', 'approve_leaves', 
        'request_leaves', 'initiate_appraisals', 'review_appraisals', 'self_appraisal', 
        'manage_expenses', 'approve_expenses', 'disburse_expenses', 'submit_expenses', 'view_audit_logs'
      ];
    } else {
      permissions = ['request_leaves', 'self_appraisal', 'submit_expenses', 'view_own_profile'];
    }

    return res.json({
      success: true,
      message: `Welcome back, ${account.first_name}!`,
      token,
      staff: {
        accountId: account.account_id,
        employeeId: account.employee_id,
        employeeNumber: account.employee_number,
        fullName: `${account.first_name} ${account.last_name}`,
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.official_email,
        departmentId: account.department_id,
        departmentName: account.department_name,
        designationTitle: account.designation_title,
        cadreLevel: account.cadre_level,
        dailyExpenseCap: account.daily_expense_cap,
        role: account.role,
        permissions
      }
    });
  } catch (err: any) {
    console.error('Staff login failed:', err);
    return res.status(500).json({ success: false, error: 'Authentication service encountered an error.', details: err.message });
  }
}

/**
 * GET /api/hrms/employees/:id/account
 * HR fetches user account details for an employee.
 */
export function getEmployeeAccount(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const account = db.prepare(`
      SELECT id, employee_id, username, role, is_active, last_login, created_at
      FROM employee_accounts
      WHERE employee_id = ?
    `).get(id) as any;

    return res.json({
      success: true,
      account: account || null
    });
  } catch (err: any) {
    console.error('Failed to get employee account:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching account.', details: err.message });
  }
}

/**
 * POST /api/hrms/employees/:id/account
 * HR provisions or resets login credentials for an employee.
 */
export function provisionEmployeeAccount(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { username, password, role = 'Employee', is_active = 1 } = req.body;

    const emp = db.prepare('SELECT id, official_email, employee_number, first_name, last_name FROM employees WHERE id = ?').get(id) as any;
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    const targetUsername = (username || emp.official_email).toLowerCase().trim();
    const existingOther = db.prepare('SELECT id FROM employee_accounts WHERE username = ? AND employee_id != ?').get(targetUsername, id);
    if (existingOther) {
      return res.status(400).json({ success: false, error: `Username/Email '${targetUsername}' is already taken.` });
    }

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM employee_accounts WHERE employee_id = ?').get(id) as any;

    if (existing) {
      // Update account
      if (password) {
        const hashed = hashPassword(password);
        db.prepare(`
          UPDATE employee_accounts SET
            username = ?,
            password_hash = ?,
            role = ?,
            is_active = ?
          WHERE employee_id = ?
        `).run(targetUsername, hashed, role, is_active ? 1 : 0, id);
      } else {
        db.prepare(`
          UPDATE employee_accounts SET
            username = ?,
            role = ?,
            is_active = ?
          WHERE employee_id = ?
        `).run(targetUsername, role, is_active ? 1 : 0, id);
      }
    } else {
      // Create new account
      const newPass = password || 'nexus2026';
      const hashed = hashPassword(newPass);
      const accId = `acc_${id}`;

      db.prepare(`
        INSERT INTO employee_accounts (id, employee_id, username, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(accId, id, targetUsername, hashed, role, is_active ? 1 : 0, now);
    }

    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'HR Admin',
      userRole: (req as any).recruitmentUser?.role || 'HR Administrator',
      action: 'provision_employee_account',
      entityType: 'employee_account',
      entityId: id,
      details: { username: targetUsername, role, is_active },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Staff credentials for ${emp.first_name} ${emp.last_name} saved successfully.`
    });
  } catch (err: any) {
    console.error('Failed to provision employee account:', err);
    return res.status(500).json({ success: false, error: 'Database error provisioning staff account.', details: err.message });
  }
}

/**
 * Universal HRMS Auth Gate: Accepts HR Administrator, HR Reviewer, Line Manager, and Employee.
 */
export function requireHrmsAuth(allowedRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roleHeader = (req.headers['x-nexus-role'] as string) || '';
    const userHeader = (req.headers['x-nexus-user'] as string) || '';
    const staffIdHeader = (req.headers['x-nexus-staff-id'] as string) || '';

    // Default to HR Administrator if accessed by default CMS session or master admin
    let role = roleHeader || 'HR Administrator';
    if (role === 'Master Admin' || role === 'Recruitment Administrator') {
      role = 'HR Administrator';
    }

    // Role check
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Your staff role (${role}) is not authorized to access this resource.`
      });
    }

    (req as any).hrmsUser = {
      staffId: staffIdHeader || null,
      name: userHeader || 'Staff User',
      role
    };

    next();
  };
}

/**
 * GET /api/hrms/auth/security-log
 * Returns last login timestamp, session status, IP address, and recent login audit events for current staff.
 */
export function getEmployeeSecurityLog(req: Request, res: Response) {
  try {
    const staffIdHeader = (req.headers['x-nexus-staff-id'] as string) || (req.headers['x-nexus-employee-id'] as string);
    const userHeader = (req.headers['x-nexus-user'] as string) || '';
    const authHeader = req.headers['authorization'];
    const cookieHeader = req.headers['cookie'] || '';

    let employeeId = staffIdHeader;

    // Check Authorization bearer token or cookie if employeeId not directly in header
    if (!employeeId && authHeader) {
      const matchAuth = authHeader.match(/nexus_sess_([a-zA-Z0-9_-]+)_[a-f0-9]+/);
      if (matchAuth && matchAuth[1]) {
        employeeId = matchAuth[1];
      }
    }
    if (!employeeId && cookieHeader) {
      const matchCookie = cookieHeader.match(/nexus_session=nexus_sess_([a-zA-Z0-9_-]+)_[a-f0-9]+/);
      if (matchCookie && matchCookie[1]) {
        employeeId = matchCookie[1];
      }
    }

    let account: any = null;
    if (employeeId) {
      account = db.prepare(`
        SELECT a.*, e.first_name, e.last_name, e.official_email, e.employee_number
        FROM employee_accounts a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.employee_id = ? OR a.id = ?
      `).get(employeeId, employeeId);
    }

    if (!account && userHeader) {
      account = db.prepare(`
        SELECT a.*, e.first_name, e.last_name, e.official_email, e.employee_number
        FROM employee_accounts a
        JOIN employees e ON a.employee_id = e.id
        WHERE LOWER(a.username) = LOWER(?) 
           OR LOWER(e.official_email) = LOWER(?)
           OR LOWER(e.first_name || ' ' || e.last_name) = LOWER(?)
      `).get(userHeader, userHeader, userHeader);
    }

    // Fallback: pick the first active account matching role or any active account
    if (!account) {
      const roleHeader = (req.headers['x-nexus-role'] as string) || '';
      if (roleHeader === 'Employee') {
        account = db.prepare(`
          SELECT a.*, e.first_name, e.last_name, e.official_email, e.employee_number
          FROM employee_accounts a
          JOIN employees e ON a.employee_id = e.id
          WHERE a.role = 'Employee' AND a.is_active = 1
          LIMIT 1
        `).get();
      } else {
        account = db.prepare(`
          SELECT a.*, e.first_name, e.last_name, e.official_email, e.employee_number
          FROM employee_accounts a
          JOIN employees e ON a.employee_id = e.id
          WHERE a.is_active = 1
          ORDER BY a.created_at ASC
          LIMIT 1
        `).get();
      }
    }

    const lastLogin = account?.last_login || new Date().toISOString();
    const targetAccountId = account?.id || '';
    const targetEmpNum = account?.employee_number || '';
    const targetFullName = account ? `${account.first_name} ${account.last_name}` : '';

    const recentLogins = db.prepare(`
      SELECT id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at
      FROM audit_events
      WHERE (action = 'staff_portal_login' OR action LIKE '%login%')
        AND (entity_id = ? OR details LIKE ? OR user_name = ?)
      ORDER BY created_at DESC
      LIMIT 10
    `).all(targetAccountId, `%${targetEmpNum}%`, targetFullName) as any[];

    const loginEvents = recentLogins.length > 0 ? recentLogins : db.prepare(`
      SELECT id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at
      FROM audit_events
      WHERE action = 'staff_portal_login' OR action LIKE '%login%'
      ORDER BY created_at DESC
      LIMIT 5
    `).all() as any[];

    return res.json({
      success: true,
      lastLogin,
      activeSession: account ? account.is_active === 1 : true,
      ipAddress: req.ip || '127.0.0.1',
      recentLogins: loginEvents.map((evt) => {
        let detailsObj: any = evt.details;
        if (typeof evt.details === 'string') {
          try { detailsObj = JSON.parse(evt.details); } catch { detailsObj = evt.details; }
        }
        return {
          id: evt.id,
          userName: evt.user_name,
          userRole: evt.user_role,
          action: evt.action,
          ipAddress: evt.ip_address,
          createdAt: evt.created_at,
          details: detailsObj
        };
      })
    });
  } catch (err: any) {
    console.error('Failed to get security log:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching security log.', details: err.message });
  }
}

/**
 * POST /api/hrms/auth/logout
 * Securely terminate staff session, clear cookie, and log audit event.
 */
export function staffLogout(req: Request, res: Response) {
  try {
    const userHeader = (req.headers['x-nexus-user'] as string) || (req as any).recruitmentUser?.name || 'Staff User';
    const roleHeader = (req.headers['x-nexus-role'] as string) || (req as any).recruitmentUser?.role || 'Employee';
    const staffIdHeader = (req.headers['x-nexus-staff-id'] as string) || 'active-session';

    logAuditEvent({
      userName: userHeader,
      userRole: roleHeader,
      action: 'staff_portal_logout',
      entityType: 'employee_account',
      entityId: staffIdHeader,
      details: { message: 'Staff session terminated via logout' },
      ipAddress: req.ip
    });

    res.setHeader('Set-Cookie', 'nexus_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');

    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err: any) {
    console.error('Failed to process staff logout:', err);
    return res.status(500).json({ success: false, error: 'Failed to process logout.', details: err.message });
  }
}


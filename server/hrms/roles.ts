import { db } from '../db.ts';
import type { Request, Response } from 'express';
import { logAuditEvent } from '../auth.ts';

/**
 * System Capabilities Catalog - Distinct abilities assignable to roles
 */
export const SYSTEM_PERMISSIONS = [
  {
    id: 'manage_roles',
    name: 'Manage Roles & Permissions',
    category: 'Security & Access Control',
    description: 'Create, update, and configure rights assigned to each user role (Super Admin only).'
  },
  {
    id: 'manage_system',
    name: 'System & Security Settings',
    category: 'Security & Access Control',
    description: 'Manage core system settings, credentials, and infrastructure parameters.'
  },
  {
    id: 'view_audit_logs',
    name: 'View Security Audit Logs',
    category: 'Security & Access Control',
    description: 'Inspect real-time system operations, authentication logs, and data mutations.'
  },
  {
    id: 'manage_employees',
    name: 'Workforce Directory Access',
    category: 'Employee Management',
    description: 'Search, view, and inspect corporate employee dossiers.'
  },
  {
    id: 'onboard_employee',
    name: 'Onboard New Employees',
    category: 'Employee Management',
    description: 'Register incoming hires and issue initial staff credentials.'
  },
  {
    id: 'edit_employee',
    name: 'Edit Employee Records',
    category: 'Employee Management',
    description: 'Update departmental assignments, designations, and compensation parameters.'
  },
  {
    id: 'offboard_employee',
    name: 'Offboard & Terminate Staff',
    category: 'Employee Management',
    description: 'Deactivate staff accounts and trigger exit protocols.'
  },
  {
    id: 'manage_departments',
    name: 'Manage Departments & Designations',
    category: 'Organization Architecture',
    description: 'Create, restructure, and configure corporate cadres and departmental hierarchies.'
  },
  {
    id: 'approve_leaves',
    name: 'Approve & Decline Leave Requests',
    category: 'Time & Leave Management',
    description: 'Review subordinate leave applications and record official decisions.'
  },
  {
    id: 'request_leaves',
    name: 'Initiate Leave Requests',
    category: 'Time & Leave Management',
    description: 'Apply for annual, casual, sick, or maternity leave via staff self-service.'
  },
  {
    id: 'initiate_appraisals',
    name: 'Initialize Appraisal Cycles',
    category: 'Performance & Appraisals',
    description: 'Launch quarterly or annual performance appraisal reviews for staff.'
  },
  {
    id: 'review_appraisals',
    name: 'Manager Review & HR Calibration',
    category: 'Performance & Appraisals',
    description: 'Evaluate subordinate KPI milestones and finalize appraisal recommendations.'
  },
  {
    id: 'self_appraisal',
    name: 'Complete Self-Appraisal',
    category: 'Performance & Appraisals',
    description: 'Staff self-score target metrics and report qualitative milestones.'
  },
  {
    id: 'manage_expenses',
    name: 'Audit & Disburse Expenses',
    category: 'Expense & Disbursements',
    description: 'Finance authority to process, verify per-diem limits, and mark reimbursements paid.'
  },
  {
    id: 'approve_expenses',
    name: 'Approve Expense Claims',
    category: 'Expense & Disbursements',
    description: 'Line manager / departmental authorization of submitted expenses.'
  },
  {
    id: 'submit_expenses',
    name: 'Submit Expense Claims',
    category: 'Expense & Disbursements',
    description: 'Submit itemized expense claims with digital receipts.'
  },
  {
    id: 'view_own_profile',
    name: 'Staff Self-Service Profile',
    category: 'Staff Self-Service',
    description: 'Access personal employee record, leave balances, and submission history.'
  }
];

/**
 * GET /api/hrms/permissions
 * List all available system permissions/abilities
 */
export function listPermissions(req: Request, res: Response) {
  return res.json({
    success: true,
    permissions: SYSTEM_PERMISSIONS
  });
}

/**
 * GET /api/hrms/roles
 * List all system roles with parsed permissions
 */
export function listRoles(req: Request, res: Response) {
  try {
    const roles = db.prepare('SELECT id, name, description, permissions, is_system, created_at FROM system_roles ORDER BY created_at ASC').all() as any[];

    const formatted = roles.map((r) => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
    }));

    return res.json({
      success: true,
      roles: formatted
    });
  } catch (err: any) {
    console.error('Failed to list roles:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve system roles.' });
  }
}

/**
 * POST /api/hrms/roles
 * Create a new custom role with assigned rights (Super Admin only)
 */
export function createRole(req: Request, res: Response) {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Role name is required.' });
    }

    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Check if role already exists
    const existing = db.prepare('SELECT id FROM system_roles WHERE id = ?').get(id);
    if (existing) {
      return res.status(409).json({ success: false, error: `Role with identifier '${id}' already exists.` });
    }

    const perms = Array.isArray(permissions) ? permissions : [];
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO system_roles (id, name, description, permissions, is_system, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, name.trim(), description || '', JSON.stringify(perms), now);

    logAuditEvent({
      userName: (req as any).user?.name || 'Super Administrator',
      userRole: 'super_admin',
      action: 'create_system_role',
      entityType: 'system_roles',
      entityId: id,
      details: { name, permissions_count: perms.length },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: `Role '${name}' created successfully.`,
      role: {
        id,
        name: name.trim(),
        description,
        permissions: perms,
        is_system: 0,
        created_at: now
      }
    });
  } catch (err: any) {
    console.error('Failed to create role:', err);
    return res.status(500).json({ success: false, error: 'Failed to create role.' });
  }
}

/**
 * PUT /api/hrms/roles/:id/permissions
 * Super Admin updates rights/permissions assigned to a role
 */
export function updateRolePermissions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Permissions must be an array of capability keys.' });
    }

    const role = db.prepare('SELECT id, name, is_system FROM system_roles WHERE id = ?').get(id) as any;
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found.' });
    }

    // Validate that super_admin always retains 'manage_roles'
    if (id === 'super_admin' && !permissions.includes('manage_roles')) {
      permissions.push('manage_roles');
    }

    db.prepare('UPDATE system_roles SET permissions = ? WHERE id = ?').run(JSON.stringify(permissions), id);

    logAuditEvent({
      userName: (req as any).user?.name || 'Super Administrator',
      userRole: 'super_admin',
      action: 'update_role_permissions',
      entityType: 'system_roles',
      entityId: id,
      details: { role_name: role.name, permissions_count: permissions.length },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Permissions updated for role '${role.name}'.`,
      role: {
        id,
        name: role.name,
        permissions
      }
    });
  } catch (err: any) {
    console.error('Failed to update role permissions:', err);
    return res.status(500).json({ success: false, error: 'Failed to update role permissions.' });
  }
}

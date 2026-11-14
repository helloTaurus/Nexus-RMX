import { db } from '../db.ts';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';

/**
 * GET /api/hrms/departments
 * List all departments with their associated designations, employee count, and department head.
 */
export function listDepartments(req: Request, res: Response) {
  try {
    const departments = db.prepare(`
      SELECT 
        d.*,
        (h.first_name || ' ' || h.last_name) as head_employee_name,
        h.official_email as head_employee_email,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.employment_status = 'Active') as active_employee_count
      FROM departments d
      LEFT JOIN employees h ON d.head_employee_id = h.id
      ORDER BY d.name ASC
    `).all() as any[];

    // Fetch designations for each department
    const designations = db.prepare(`
      SELECT des.*, 
        (SELECT COUNT(*) FROM employees e WHERE e.designation_id = des.id AND e.employment_status = 'Active') as employee_count
      FROM designations des
      ORDER BY des.grade_code DESC, des.title ASC
    `).all() as any[];

    const deptWithDesignations = departments.map((dept) => ({
      ...dept,
      designations: designations.filter((des) => des.department_id === dept.id)
    }));

    return res.json({
      success: true,
      departments: deptWithDesignations
    });
  } catch (err: any) {
    console.error('Failed to list departments:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching departments.', details: err.message });
  }
}

/**
 * POST /api/hrms/departments
 * Create a new department.
 */
export function createDepartment(req: Request, res: Response) {
  try {
    const { name, code, description, head_employee_id } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Department name and code are required.' });
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = db.prepare('SELECT id FROM departments WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ success: false, error: `Department code '${cleanCode}' already exists.` });
    }

    const id = `dept-${cleanCode.toLowerCase()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO departments (id, name, code, description, head_employee_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, cleanCode, description || null, head_employee_id || null, now);

    return res.status(201).json({
      success: true,
      department: { id, name, code: cleanCode, description, head_employee_id }
    });
  } catch (err: any) {
    console.error('Failed to create department:', err);
    return res.status(500).json({ success: false, error: 'Failed to create department.', details: err.message });
  }
}

/**
 * POST /api/hrms/designations
 * Create a new job cadre / designation with daily expense limit.
 */
export function createDesignation(req: Request, res: Response) {
  try {
    const { department_id, title, cadre_level, grade_code, daily_expense_cap = 25000 } = req.body;

    if (!department_id || !title || !cadre_level || !grade_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'department_id, title, cadre_level, and grade_code are required.' 
      });
    }

    const deptExists = db.prepare('SELECT id FROM departments WHERE id = ?').get(department_id);
    if (!deptExists) {
      return res.status(404).json({ success: false, error: 'Department not found.' });
    }

    const id = `desig_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO designations (id, department_id, title, cadre_level, grade_code, daily_expense_cap, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, department_id, title, cadre_level, grade_code, daily_expense_cap, now);

    return res.status(201).json({
      success: true,
      designation: { id, department_id, title, cadre_level, grade_code, daily_expense_cap }
    });
  } catch (err: any) {
    console.error('Failed to create designation:', err);
    return res.status(500).json({ success: false, error: 'Failed to create designation.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/departments/:id
 * Update an existing department's name, code, description, or head of department.
 */
export function updateDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, description, head_employee_id } = req.body;

    const existing = db.prepare('SELECT id, code FROM departments WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Department not found.' });
    }

    if (code && code.toUpperCase().trim() !== existing.code) {
      const cleanCode = code.toUpperCase().trim();
      const duplicate = db.prepare('SELECT id FROM departments WHERE code = ? AND id != ?').get(cleanCode, id);
      if (duplicate) {
        return res.status(400).json({ success: false, error: `Department code '${cleanCode}' is already used by another department.` });
      }
    }

    db.prepare(`
      UPDATE departments SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        head_employee_id = COALESCE(?, head_employee_id)
      WHERE id = ?
    `).run(
      name || null,
      code ? code.toUpperCase().trim() : null,
      description !== undefined ? description : null,
      head_employee_id !== undefined ? head_employee_id : null,
      id
    );

    return res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err: any) {
    console.error('Failed to update department:', err);
    return res.status(500).json({ success: false, error: 'Database error updating department.', details: err.message });
  }
}

/**
 * DELETE /api/hrms/departments/:id
 * Remove an empty department.
 */
export function deleteDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const empCount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE department_id = ?').get(id) as { count: number };
    if (empCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete department: ${empCount.count} active or registered staff member(s) are assigned to it.`
      });
    }

    db.prepare('DELETE FROM designations WHERE department_id = ?').run(id);
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Department deleted successfully.' });
  } catch (err: any) {
    console.error('Failed to delete department:', err);
    return res.status(500).json({ success: false, error: 'Database error deleting department.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/designations/:id
 * Update title, cadre level, grade code, or per-diem daily expense cap.
 */
export function updateDesignation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, cadre_level, grade_code, daily_expense_cap, department_id } = req.body;

    const existing = db.prepare('SELECT id FROM designations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Designation not found.' });
    }

    db.prepare(`
      UPDATE designations SET
        title = COALESCE(?, title),
        cadre_level = COALESCE(?, cadre_level),
        grade_code = COALESCE(?, grade_code),
        daily_expense_cap = COALESCE(?, daily_expense_cap),
        department_id = COALESCE(?, department_id)
      WHERE id = ?
    `).run(
      title || null,
      cadre_level || null,
      grade_code || null,
      daily_expense_cap !== undefined ? daily_expense_cap : null,
      department_id || null,
      id
    );

    return res.json({ success: true, message: 'Designation updated successfully.' });
  } catch (err: any) {
    console.error('Failed to update designation:', err);
    return res.status(500).json({ success: false, error: 'Database error updating designation.', details: err.message });
  }
}

/**
 * DELETE /api/hrms/designations/:id
 * Delete designation if no active staff member is assigned.
 */
export function deleteDesignation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const empCount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE designation_id = ?').get(id) as { count: number };
    if (empCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete designation: ${empCount.count} active staff member(s) hold this title.`
      });
    }

    db.prepare('DELETE FROM designations WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Designation deleted successfully.' });
  } catch (err: any) {
    console.error('Failed to delete designation:', err);
    return res.status(500).json({ success: false, error: 'Database error deleting designation.', details: err.message });
  }
}

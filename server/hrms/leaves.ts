import { db } from '../db.ts';
import crypto from 'node:crypto';
import { logAuditEvent } from '../auth.ts';
import type { Request, Response } from 'express';

/**
 * GET /api/hrms/leaves/types
 * List all available leave categories and default annual day allocations.
 */
export function listLeaveTypes(req: Request, res: Response) {
  try {
    const leaveTypes = db.prepare('SELECT * FROM leave_types ORDER BY name ASC').all();
    return res.json({ success: true, leaveTypes });
  } catch (err: any) {
    console.error('Failed to list leave types:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching leave types.', details: err.message });
  }
}

/**
 * GET /api/hrms/leaves/requests
 * List leave requests across the organization (filterable by employee, status, or department).
 */
export function listLeaveRequests(req: Request, res: Response) {
  try {
    const { employee_id, status, department_id, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        lr.*,
        lt.name as leave_type_name,
        e.first_name,
        e.last_name,
        e.employee_number,
        e.official_email,
        d.name as department_name,
        (r.first_name || ' ' || r.last_name) as relief_employee_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees r ON lr.relief_employee_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employee_id) {
      query += ` AND lr.employee_id = ?`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND lr.status = ?`;
      params.push(status);
    }

    if (department_id) {
      query += ` AND e.department_id = ?`;
      params.push(department_id);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = db.prepare(countSql).get(...params) as { total: number };

    query += ` ORDER BY lr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const requests = db.prepare(query).all(...params);

    return res.json({
      success: true,
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Failed to list leave requests:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch leave requests.', details: err.message });
  }
}

/**
 * POST /api/hrms/leaves/requests
 * Submit a formal leave application with balance checks.
 */
export function submitLeaveRequest(req: Request, res: Response) {
  try {
    const {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days_requested,
      reason,
      handover_notes,
      relief_employee_id
    } = req.body;

    if (!employee_id || !leave_type_id || !start_date || !end_date || !days_requested || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'employee_id, leave_type_id, start_date, end_date, days_requested, and reason are required.' 
      });
    }

    const requestedNum = parseFloat(days_requested);
    if (isNaN(requestedNum) || requestedNum <= 0) {
      return res.status(400).json({ success: false, error: 'days_requested must be a positive number.' });
    }

    const emp = db.prepare('SELECT id, employee_number, first_name, last_name FROM employees WHERE id = ?').get(employee_id) as any;
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    const currentYear = new Date(start_date).getFullYear() || new Date().getFullYear();
    const balance = db.prepare(`
      SELECT * FROM employee_leave_balances 
      WHERE employee_id = ? AND leave_type_id = ? AND year = ?
    `).get(employee_id, leave_type_id, currentYear) as any;

    if (!balance) {
      return res.status(400).json({ 
        success: false, 
        error: `No leave entitlement balance initialized for this leave type in ${currentYear}.` 
      });
    }

    const availableDays = balance.entitled_days - balance.used_days - balance.pending_days;
    if (requestedNum > availableDays) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient leave balance. Requested: ${requestedNum} days, Available: ${availableDays} days.` 
      });
    }

    const now = new Date().toISOString();
    const requestId = `leave_${crypto.randomUUID()}`;

    // 1. Create leave request
    db.prepare(`
      INSERT INTO leave_requests (
        id, employee_id, leave_type_id, start_date, end_date, days_requested,
        reason, handover_notes, relief_employee_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `).run(
      requestId,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      requestedNum,
      reason,
      handover_notes || null,
      relief_employee_id || null,
      now
    );

    // 2. Reserve days in pending balance
    db.prepare(`
      UPDATE employee_leave_balances 
      SET pending_days = pending_days + ? 
      WHERE id = ?
    `).run(requestedNum, balance.id);

    logAuditEvent({
      userName: `${emp.first_name} ${emp.last_name}`,
      userRole: 'Employee',
      action: 'submit_leave_request',
      entityType: 'leave_request',
      entityId: requestId,
      details: { start_date, end_date, days_requested: requestedNum, reason },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully for manager approval.',
      requestId
    });
  } catch (err: any) {
    console.error('Failed to submit leave request:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit leave request.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/leaves/requests/:id/action
 * Approve or Reject a leave application.
 */
export function actionLeaveRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body; // action: 'Approved' | 'Rejected'

    if (!action || !['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ success: false, error: "action must be either 'Approved' or 'Rejected'." });
    }

    const leaveReq = db.prepare(`
      SELECT lr.*, e.first_name, e.last_name, e.official_email
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = ?
    `).get(id) as any;

    if (!leaveReq) {
      return res.status(404).json({ success: false, error: 'Leave request not found.' });
    }

    if (leaveReq.status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot action request because it is already ${leaveReq.status}.` 
      });
    }

    const now = new Date().toISOString();
    const approvedBy = (req as any).recruitmentUser?.name || 'Line Manager';
    const currentYear = new Date(leaveReq.start_date).getFullYear() || new Date().getFullYear();

    const balance = db.prepare(`
      SELECT * FROM employee_leave_balances 
      WHERE employee_id = ? AND leave_type_id = ? AND year = ?
    `).get(leaveReq.employee_id, leaveReq.leave_type_id, currentYear) as any;

    if (action === 'Approved') {
      // Deduct from pending, add to used
      if (balance) {
        db.prepare(`
          UPDATE employee_leave_balances 
          SET pending_days = MAX(0, pending_days - ?), used_days = used_days + ?
          WHERE id = ?
        `).run(leaveReq.days_requested, leaveReq.days_requested, balance.id);
      }

      db.prepare(`
        UPDATE leave_requests 
        SET status = 'Approved', approved_by = ?, approved_at = ?
        WHERE id = ?
      `).run(approvedBy, now, id);
    } else {
      // Rejected: return days from pending
      if (balance) {
        db.prepare(`
          UPDATE employee_leave_balances 
          SET pending_days = MAX(0, pending_days - ?)
          WHERE id = ?
        `).run(leaveReq.days_requested, balance.id);
      }

      db.prepare(`
        UPDATE leave_requests 
        SET status = 'Rejected', approved_by = ?, approved_at = ?, rejection_reason = ?
        WHERE id = ?
      `).run(approvedBy, now, rejection_reason || 'Administrative discretion.', id);
    }

    logAuditEvent({
      userName: approvedBy,
      userRole: (req as any).recruitmentUser?.role || 'Hiring Manager',
      action: `leave_${action.toLowerCase()}`,
      entityType: 'leave_request',
      entityId: id,
      details: { action, days: leaveReq.days_requested, employee: leaveReq.official_email },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Leave request has been ${action}.`
    });
  } catch (err: any) {
    console.error('Failed to action leave request:', err);
    return res.status(500).json({ success: false, error: 'Failed to process leave action.', details: err.message });
  }
}

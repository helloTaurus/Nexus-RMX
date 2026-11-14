import { db } from '../db.ts';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateAndStoreGeneralDocument, EXPENSE_RECEIPTS_DIR } from '../storage.ts';
import { logAuditEvent } from '../auth.ts';
import type { Request, Response } from 'express';

/**
 * Generate sequential enterprise expense claim number (e.g. EXP-2026-0001)
 */
export function generateClaimNumber(): string {
  const latest = db.prepare(`
    SELECT claim_number FROM expense_claims 
    WHERE claim_number LIKE 'EXP-%' 
    ORDER BY claim_number DESC LIMIT 1
  `).get() as { claim_number: string } | undefined;

  let nextSeq = 1;
  const currentYear = new Date().getFullYear();
  if (latest && latest.claim_number) {
    const parts = latest.claim_number.split('-');
    if (parts.length === 3) {
      const numPart = parseInt(parts[2], 10);
      if (!isNaN(numPart)) nextSeq = numPart + 1;
    }
  }

  return `EXP-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * GET /api/hrms/expenses/claims
 * List claims with joined employee name, department, designation, and expense items count.
 */
export function listExpenseClaims(req: Request, res: Response) {
  try {
    const { employee_id, status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        c.*,
        e.first_name,
        e.last_name,
        e.employee_number,
        e.official_email,
        d.name as department_name,
        des.title as designation_title,
        des.daily_expense_cap,
        (SELECT COUNT(*) FROM expense_items i WHERE i.claim_id = c.id) as item_count
      FROM expense_claims c
      JOIN employees e ON c.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      JOIN designations des ON e.designation_id = des.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employee_id) {
      query += ` AND c.employee_id = ?`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = db.prepare(countSql).get(...params) as { total: number };

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const claims = db.prepare(query).all(...params);

    return res.json({
      success: true,
      claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Failed to list expense claims:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching expense claims.', details: err.message });
  }
}

/**
 * GET /api/hrms/expenses/claims/:id
 * Retrieve single expense claim with all detailed line items and attached receipt assets.
 */
export function getExpenseClaimDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const claim = db.prepare(`
      SELECT 
        c.*,
        e.first_name,
        e.last_name,
        e.employee_number,
        e.official_email,
        d.name as department_name,
        des.title as designation_title,
        des.cadre_level,
        des.daily_expense_cap
      FROM expense_claims c
      JOIN employees e ON c.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      JOIN designations des ON e.designation_id = des.id
      WHERE c.id = ?
    `).get(id) as any;

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Expense claim not found.' });
    }

    const items = db.prepare(`
      SELECT 
        i.*,
        r.id as receipt_id,
        r.original_filename as receipt_filename,
        r.file_size_bytes as receipt_size_bytes,
        r.mime_type as receipt_mime_type,
        r.scan_status as receipt_scan_status
      FROM expense_items i
      LEFT JOIN expense_receipts r ON i.id = r.expense_item_id
      WHERE i.claim_id = ?
      ORDER BY i.expense_date ASC
    `).all(id);

    return res.json({
      success: true,
      claim,
      items
    });
  } catch (err: any) {
    console.error('Failed to get expense claim details:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claim details.', details: err.message });
  }
}

/**
 * POST /api/hrms/expenses/claims
 * Create a new expense claim draft with optional initial line items.
 */
export function createExpenseClaim(req: Request, res: Response) {
  try {
    const { employee_id, title, purpose, items = [] } = req.body;

    if (!employee_id || !title || !purpose) {
      return res.status(400).json({ success: false, error: 'employee_id, title, and purpose are required.' });
    }

    const emp = db.prepare(`
      SELECT e.id, des.daily_expense_cap, des.title as designation_title
      FROM employees e
      JOIN designations des ON e.designation_id = des.id
      WHERE e.id = ?
    `).get(employee_id) as any;

    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    const claimId = `exp_${crypto.randomUUID()}`;
    const claimNumber = generateClaimNumber();
    const now = new Date().toISOString();

    let totalAmount = 0;
    const itemInserts: any[] = [];
    let policyWarning: string | null = null;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const amt = parseFloat(item.amount) || 0;
        totalAmount += amt;

        if (amt > emp.daily_expense_cap) {
          policyWarning = `Item '${item.category}' amount (₦${amt.toLocaleString()}) exceeds standard per-diem cap of ₦${emp.daily_expense_cap.toLocaleString()} for ${emp.designation_title}. Line manager justification required.`;
        }

        itemInserts.push({
          id: `item_${crypto.randomUUID()}`,
          claim_id: claimId,
          category: item.category || 'General Operations',
          amount: amt,
          expense_date: item.expense_date || now.split('T')[0],
          merchant_name: item.merchant_name || 'Vendor',
          description: item.description || null
        });
      }
    }

    // 1. Insert Claim
    db.prepare(`
      INSERT INTO expense_claims (
        id, claim_number, employee_id, title, purpose, total_amount,
        status, current_approver_role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Draft', 'Line Manager', ?, ?)
    `).run(claimId, claimNumber, employee_id, title, purpose, totalAmount, now, now);

    // 2. Insert line items
    const insertItemStmt = db.prepare(`
      INSERT INTO expense_items (id, claim_id, category, amount, expense_date, merchant_name, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of itemInserts) {
      insertItemStmt.run(
        item.id,
        item.claim_id,
        item.category,
        item.amount,
        item.expense_date,
        item.merchant_name,
        item.description,
        now
      );
    }

    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'Staff User',
      userRole: 'Employee',
      action: 'create_expense_claim',
      entityType: 'expense_claim',
      entityId: claimId,
      details: { claim_number: claimNumber, total_amount: totalAmount, items_count: itemInserts.length },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Expense claim created successfully.',
      claim: {
        id: claimId,
        claim_number: claimNumber,
        total_amount: totalAmount,
        status: 'Draft',
        policy_warning: policyWarning
      }
    });
  } catch (err: any) {
    console.error('Failed to create expense claim:', err);
    return res.status(500).json({ success: false, error: 'Failed to create expense claim.', details: err.message });
  }
}

/**
 * POST /api/hrms/expenses/items/:itemId/receipt
 * Attach an official proof-of-payment receipt (image/PDF) to a line item.
 */
export async function uploadExpenseReceipt(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const { filename, file_base64 } = req.body;

    if (!filename || !file_base64) {
      return res.status(400).json({ success: false, error: 'filename and file_base64 are required.' });
    }

    const item = db.prepare('SELECT id, claim_id FROM expense_items WHERE id = ?').get(itemId) as any;
    if (!item) {
      return res.status(404).json({ success: false, error: 'Expense item not found.' });
    }

    const rawBuffer = Buffer.from(file_base64.replace(/^data:.*?;base64,/, ''), 'base64');
    const storeResult = await validateAndStoreGeneralDocument(rawBuffer, filename, EXPENSE_RECEIPTS_DIR);

    if (!storeResult.success) {
      return res.status(400).json({ success: false, error: storeResult.error });
    }

    const receiptId = `rcpt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO expense_receipts (
        id, expense_item_id, original_filename, storage_path, file_size_bytes, mime_type, file_sha256, scan_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'clean', ?)
    `).run(
      receiptId,
      itemId,
      storeResult.file.originalFilename,
      storeResult.file.storagePath,
      storeResult.file.sizeBytes,
      storeResult.file.mimeType,
      storeResult.file.sha256,
      now
    );

    // Link receipt ID back to item
    db.prepare('UPDATE expense_items SET receipt_document_id = ? WHERE id = ?').run(receiptId, itemId);

    return res.status(201).json({
      success: true,
      message: 'Expense receipt uploaded and linked successfully.',
      receipt: {
        id: receiptId,
        filename: storeResult.file.originalFilename,
        size_bytes: storeResult.file.sizeBytes,
        mime_type: storeResult.file.mimeType
      }
    });
  } catch (err: any) {
    console.error('Failed to upload receipt:', err);
    return res.status(500).json({ success: false, error: 'Receipt upload failed.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/expenses/claims/:id/action
 * Progress the 2-tier approval workflow:
 * 'Submitted' -> 'Line Manager Approved' -> 'Finance Approved' -> 'Reimbursed' (or 'Rejected').
 */
export function actionExpenseClaim(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; 
    // action: 'submit' | 'manager_approve' | 'finance_approve' | 'reimburse' | 'reject'

    const claim = db.prepare('SELECT * FROM expense_claims WHERE id = ?').get(id) as any;
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Expense claim not found.' });
    }

    const now = new Date().toISOString();
    let newStatus = claim.status;
    let nextApproverRole = claim.current_approver_role;

    if (action === 'submit') {
      if (claim.status !== 'Draft') {
        return res.status(400).json({ success: false, error: 'Only Draft claims can be submitted.' });
      }
      newStatus = 'Submitted';
      nextApproverRole = 'Line Manager';
    } else if (action === 'manager_approve') {
      if (claim.status !== 'Submitted') {
        return res.status(400).json({ success: false, error: 'Claim must be in Submitted state for Line Manager approval.' });
      }
      newStatus = 'Line Manager Approved';
      nextApproverRole = 'Finance / Internal Audit';
    } else if (action === 'finance_approve') {
      if (claim.status !== 'Line Manager Approved') {
        return res.status(400).json({ success: false, error: 'Claim must be approved by Line Manager before Finance audit.' });
      }
      newStatus = 'Finance Approved';
      nextApproverRole = 'Disbursement Desk';
    } else if (action === 'reimburse') {
      if (claim.status !== 'Finance Approved') {
        return res.status(400).json({ success: false, error: 'Claim must be Finance Approved before reimbursement.' });
      }
      newStatus = 'Reimbursed';
      nextApproverRole = 'Completed';
    } else if (action === 'reject') {
      newStatus = 'Rejected';
      nextApproverRole = 'None';
    } else {
      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    }

    db.prepare(`
      UPDATE expense_claims SET
        status = ?,
        current_approver_role = ?,
        rejection_note = CASE WHEN ? = 'Rejected' THEN ? ELSE rejection_note END,
        settled_at = CASE WHEN ? = 'Reimbursed' THEN ? ELSE settled_at END,
        updated_at = ?
      WHERE id = ?
    `).run(
      newStatus,
      nextApproverRole,
      newStatus,
      notes || null,
      newStatus,
      now,
      now,
      id
    );

    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'Approver',
      userRole: (req as any).recruitmentUser?.role || 'Hiring Manager',
      action: `expense_${action}`,
      entityType: 'expense_claim',
      entityId: id,
      details: { previous_status: claim.status, new_status: newStatus, notes },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Claim ${claim.claim_number} is now ${newStatus}.`,
      status: newStatus,
      current_approver_role: nextApproverRole
    });
  } catch (err: any) {
    console.error('Failed to action expense claim:', err);
    return res.status(500).json({ success: false, error: 'Failed to process expense action.', details: err.message });
  }
}

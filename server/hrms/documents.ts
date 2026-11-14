import { db } from '../db.ts';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateAndStoreGeneralDocument, EMPLOYEE_DOCS_DIR } from '../storage.ts';
import { logAuditEvent } from '../auth.ts';
import type { Request, Response } from 'express';

/**
 * GET /api/hrms/documents/:id/download
 * Secure document retrieval with path traversal validation.
 */
export function downloadEmployeeDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const doc = db.prepare(`
      SELECT d.*, e.first_name, e.last_name, e.employee_number 
      FROM employee_documents d
      JOIN employees e ON d.employee_id = e.id
      WHERE d.id = ?
    `).get(id) as any;

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const resolved = path.resolve(doc.storage_path);
    if (!fs.existsSync(resolved) || !resolved.startsWith(EMPLOYEE_DOCS_DIR)) {
      return res.status(404).json({ success: false, error: 'File asset does not exist on disk.' });
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
    return res.sendFile(resolved);
  } catch (err: any) {
    console.error('Failed to download document:', err);
    return res.status(500).json({ success: false, error: 'File retrieval error.', details: err.message });
  }
}

/**
 * POST /api/hrms/employees/:employeeId/documents
 * Upload an onboarding or compliance document (Base64 payload or raw buffer).
 */
export async function uploadEmployeeDocument(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const { document_type, filename, file_base64, notes } = req.body;

    if (!document_type || !filename || !file_base64) {
      return res.status(400).json({ 
        success: false, 
        error: 'document_type, filename, and file_base64 are required.' 
      });
    }

    const emp = db.prepare('SELECT id, employee_number FROM employees WHERE id = ?').get(employeeId) as any;
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    // Decode base64
    const rawBuffer = Buffer.from(file_base64.replace(/^data:.*?;base64,/, ''), 'base64');
    const storeResult = await validateAndStoreGeneralDocument(rawBuffer, filename, EMPLOYEE_DOCS_DIR);

    if (!storeResult.success) {
      return res.status(400).json({ success: false, error: storeResult.error });
    }

    const now = new Date().toISOString();
    const docId = `doc_${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO employee_documents (
        id, employee_id, document_type, original_filename, storage_path,
        file_size_bytes, mime_type, file_sha256, verification_status,
        verified_by, verified_at, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', null, null, ?, ?)
    `).run(
      docId,
      employeeId,
      document_type,
      storeResult.file.originalFilename,
      storeResult.file.storagePath,
      storeResult.file.sizeBytes,
      storeResult.file.mimeType,
      storeResult.file.sha256,
      notes || null,
      now
    );

    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'HR Admin',
      userRole: (req as any).recruitmentUser?.role || 'Recruitment Administrator',
      action: 'upload_employee_document',
      entityType: 'employee_document',
      entityId: docId,
      details: { employee_id: employeeId, document_type, filename },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      document: {
        id: docId,
        document_type,
        filename: storeResult.file.originalFilename,
        size_bytes: storeResult.file.sizeBytes,
        verification_status: 'Pending',
        created_at: now
      }
    });
  } catch (err: any) {
    console.error('Failed to upload employee document:', err);
    return res.status(500).json({ success: false, error: 'Document upload failed.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/documents/:id/verify
 * HR Reviewer approves or rejects an employee compliance document.
 */
export function verifyEmployeeDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { verification_status, notes } = req.body;

    if (!verification_status || !['Verified', 'Rejected', 'Pending'].includes(verification_status)) {
      return res.status(400).json({ 
        success: false, 
        error: "verification_status must be 'Verified', 'Rejected', or 'Pending'." 
      });
    }

    const doc = db.prepare('SELECT id, employee_id, document_type FROM employee_documents WHERE id = ?').get(id) as any;
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const now = new Date().toISOString();
    const verifiedBy = (req as any).recruitmentUser?.name || 'HR Compliance Desk';

    db.prepare(`
      UPDATE employee_documents 
      SET verification_status = ?, verified_by = ?, verified_at = ?, notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(verification_status, verifiedBy, now, notes || null, id);

    logAuditEvent({
      userName: verifiedBy,
      userRole: (req as any).recruitmentUser?.role || 'Recruitment Administrator',
      action: 'verify_employee_document',
      entityType: 'employee_document',
      entityId: id,
      details: { verification_status, notes },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Document status updated to ${verification_status}.`
    });
  } catch (err: any) {
    console.error('Failed to verify employee document:', err);
    return res.status(500).json({ success: false, error: 'Verification failed.', details: err.message });
  }
}

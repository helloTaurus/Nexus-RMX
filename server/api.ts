import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { db } from './db.ts';
import { validateAndStoreCv, getCvFile, deleteCvFile } from './storage.ts';
import { enqueueApplicationEmails, retryOutboxEmail, processOutboxQueue } from './email.ts';
import { requireRecruitmentAuth, logAuditEvent, RecruitmentRole } from './auth.ts';

export const recruitmentRouter = Router();

/**
 * Helper to parse multipart/form-data requests using Node 24 native web standard Request & FormData.
 */
async function parseMultipartFormData(req: Request): Promise<FormData> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);
  const host = req.get('host') || 'localhost';
  const url = `http://${host}${req.originalUrl}`;
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(', ');
  }

  const webReq = new globalThis.Request(url, {
    method: req.method,
    headers,
    body: body.length > 0 ? body : undefined
  });

  return await webReq.formData();
}

/**
 * Validate phone numbers (supports Nigerian local 080..., 070..., 090..., 081... and international +234..., +1..., etc.)
 */
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Matches Nigerian mobile (070, 080, 081, 090, 091 + 8 digits) or international (+ followed by 7-15 digits)
  const nigerianRegex = /^(0|\+?234)(70|80|81|90|91|802|803|804|805|806|807|808|809|701|702|703|704|705|706|707|708|709)\d{7,8}$/;
  const intlRegex = /^\+?[1-9]\d{7,14}$/;
  return nigerianRegex.test(cleaned) || intlRegex.test(cleaned) || cleaned.length >= 10;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =========================================================================
// 1. PUBLIC ENDPOINTS
// =========================================================================

/**
 * GET /api/recruitment/vacancies
 * Public list of published, open positions
 */
recruitmentRouter.get('/vacancies', (req: Request, res: Response) => {
  try {
    const vacancies = db.prepare(`
      SELECT id, title, department, location, type, experience, salary_range,
             description, responsibilities, requirements, closing_date, status, updated_at
      FROM vacancies
      WHERE status = 'Published'
      ORDER BY created_at DESC
    `).all();

    const formatted = vacancies.map((v: any) => ({
      ...v,
      responsibilities: v.responsibilities ? JSON.parse(v.responsibilities) : [],
      requirements: v.requirements ? JSON.parse(v.requirements) : []
    }));

    res.json({ success: true, vacancies: formatted });
  } catch (err: any) {
    console.error('Error fetching vacancies:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve available vacancies.' });
  }
});

/**
 * POST /api/recruitment/apply
 * Public candidate application submission (Vacancy application or General CV)
 */
recruitmentRouter.post('/apply', async (req: Request, res: Response) => {
  try {
    let formData: FormData;
    try {
      formData = await parseMultipartFormData(req);
    } catch (parseErr: any) {
      console.error('Multipart parse failure:', parseErr);
      return res.status(400).json({ success: false, error: 'Invalid form submission format.' });
    }

    // 1. Extract and validate required fields
    const fullName = (formData.get('fullName') as string || '').trim();
    const email = (formData.get('email') as string || '').trim().toLowerCase();
    const phone = (formData.get('phone') as string || '').trim();
    const submissionType = (formData.get('submissionType') as string || 'vacancy').trim().toLowerCase();
    const vacancyId = (formData.get('vacancyId') as string || '').trim();
    const areaOfInterest = (formData.get('areaOfInterest') as string || '').trim();
    const coverNote = (formData.get('coverNote') as string || '').trim();
    const portfolioUrl = (formData.get('portfolioUrl') as string || '').trim();
    const idempotencyKey = (formData.get('idempotencyKey') as string || '').trim();
    const talentPoolConsentRaw = formData.get('talentPoolConsent');
    const talentPoolConsent = talentPoolConsentRaw === 'true' || talentPoolConsentRaw === '1' || talentPoolConsentRaw === 'on';

    if (!fullName || fullName.length < 2) {
      return res.status(400).json({ success: false, error: 'Please enter your full legal name.' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid telephone number (e.g. 08012345678 or +2348012345678).' });
    }

    // 2. Check Idempotency Key (handles double-clicks and network retries)
    if (idempotencyKey) {
      const existingApp = db.prepare(`
        SELECT a.id, a.reference_number, a.submission_type, a.status, c.full_name
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        WHERE a.idempotency_key = ?
      `).get(idempotencyKey) as any;

      if (existingApp) {
        // Return existing application response safely without creating duplicate record or email
        return res.json({
          success: true,
          referenceNumber: existingApp.reference_number,
          candidateName: existingApp.full_name,
          submissionType: existingApp.submission_type,
          message: 'Your application was already received and safely queued.'
        });
      }
    }

    // 3. Validate Submission Type & Vacancy
    let vacancyTitle: string | undefined;
    if (submissionType === 'vacancy') {
      if (!vacancyId) {
        return res.status(400).json({ success: false, error: 'Vacancy ID is required for advertised position applications.' });
      }
      const vacancy = db.prepare('SELECT id, title, status FROM vacancies WHERE id = ?').get(vacancyId) as any;
      if (!vacancy) {
        return res.status(400).json({ success: false, error: 'The specified vacancy opening was not found.' });
      }
      if (vacancy.status !== 'Published') {
        return res.status(400).json({ success: false, error: 'This vacancy is no longer accepting new applications.' });
      }
      vacancyTitle = vacancy.title;

      // Duplicate check policy: Prevent duplicate application to the exact same vacancy within 24h
      const recentDup = db.prepare(`
        SELECT a.reference_number, a.created_at
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        WHERE c.email = ? AND a.vacancy_id = ?
        ORDER BY a.created_at DESC LIMIT 1
      `).get(email, vacancyId) as any;

      if (recentDup) {
        const hoursAgo = (Date.now() - new Date(recentDup.created_at).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
          // Re-affirm existing submission without error
          return res.json({
            success: true,
            referenceNumber: recentDup.reference_number,
            candidateName: fullName,
            submissionType,
            message: 'You have already submitted an active application for this role today. Your application is under review.'
          });
        }
      }
    } else if (submissionType === 'general') {
      if (!areaOfInterest) {
        return res.status(400).json({ success: false, error: 'Please specify your area of interest (e.g. Credit Risk, Operations, Engineering).' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid submission type.' });
    }

    // 4. Validate and Store Uploaded CV
    const cvFile = formData.get('cv');
    if (!cvFile || typeof cvFile !== 'object' || !('arrayBuffer' in cvFile)) {
      return res.status(400).json({ success: false, error: 'A CV file in PDF or DOCX format is required.' });
    }

    const fileObj = cvFile as File;
    const arrayBuffer = await fileObj.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    const storeResult = await validateAndStoreCv(rawBuffer, fileObj.name, fileObj.type);
    if (!storeResult.success) {
      return res.status(400).json({ success: false, error: storeResult.error });
    }

    const storedDoc = storeResult.file;

    // 5. Generate Reference Number & Retention Expiry
    const now = new Date();
    const nowIso = now.toISOString();
    const currentYear = now.getFullYear();
    const randomSeq = Math.floor(100000 + Math.random() * 900000); // 6 digits
    const referenceNumber = `NEX-REC-${currentYear}-${randomSeq}`;

    // Retention duration calculation
    const retentionSettingKey = talentPoolConsent ? 'retention_talent_pool_days' : (submissionType === 'general' ? 'retention_general_cv_days' : 'retention_unsuccessful_days');
    const settingRow = db.prepare('SELECT value FROM recruitment_settings WHERE key = ?').get(retentionSettingKey) as { value: string } | undefined;
    const retentionDays = parseInt(settingRow?.value || (talentPoolConsent ? '730' : '180'), 10);
    const retentionExpiryDate = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // 6. Database Transaction: Candidate + Application + Document + Status History
    let candidate = db.prepare('SELECT id FROM candidates WHERE email = ?').get(email) as { id: string } | undefined;
    let candidateId = candidate ? candidate.id : crypto.randomUUID();

    if (candidate) {
      db.prepare(`
        UPDATE candidates SET full_name = ?, phone = ?, linkedin_url = ?, updated_at = ? WHERE id = ?
      `).run(fullName, phone, portfolioUrl || null, nowIso, candidateId);
    } else {
      db.prepare(`
        INSERT INTO candidates (id, full_name, email, phone, linkedin_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(candidateId, fullName, email, phone, portfolioUrl || null, nowIso, nowIso);
    }

    const applicationId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const historyId = crypto.randomUUID();

    // Insert Application
    db.prepare(`
      INSERT INTO applications (
        id, reference_number, candidate_id, submission_type, vacancy_id,
        area_of_interest, cover_note, portfolio_url, status, idempotency_key,
        privacy_notice_version, talent_pool_consent, talent_pool_consent_at,
        talent_pool_notice_version, retention_expiry, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, 'v2026.1', ?, ?, ?, ?, ?, ?)
    `).run(
      applicationId,
      referenceNumber,
      candidateId,
      submissionType,
      submissionType === 'vacancy' ? vacancyId : null,
      submissionType === 'general' ? areaOfInterest : null,
      coverNote || null,
      portfolioUrl || null,
      idempotencyKey || null,
      talentPoolConsent ? 1 : 0,
      talentPoolConsent ? nowIso : null,
      talentPoolConsent ? 'v2026.1' : null,
      retentionExpiryDate,
      nowIso,
      nowIso
    );

    // Insert Document Record
    db.prepare(`
      INSERT INTO application_documents (
        id, application_id, original_filename, storage_path, file_size_bytes,
        mime_type, file_sha256, scan_status, scan_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId,
      applicationId,
      storedDoc.originalFilename,
      storedDoc.storagePath,
      storedDoc.sizeBytes,
      storedDoc.mimeType,
      storedDoc.sha256,
      storedDoc.scanStatus,
      storedDoc.scanNotes,
      nowIso
    );

    // Insert Initial Status History
    db.prepare(`
      INSERT INTO application_status_history (
        id, application_id, previous_status, new_status, changed_by_name,
        changed_by_role, comment, created_at
      ) VALUES (?, ?, null, 'New', 'System Desk', 'Automated Intake', 'Application submitted and validated via public careers portal.', ?)
    `).run(historyId, applicationId, nowIso);

    // 7. Enqueue Durable Outbox Emails (HR Notification + Applicant Confirmation)
    enqueueApplicationEmails({
      applicationId,
      referenceNumber,
      submissionType: submissionType as 'vacancy' | 'general',
      vacancyTitle,
      areaOfInterest,
      candidateName: fullName,
      candidateEmail: email,
      candidatePhone: phone,
      talentPoolConsent,
      coverNote,
      portfolioUrl,
      hasCv: true,
      cvFilename: storedDoc.originalFilename
    });

    // 8. Log Audit Event
    logAuditEvent({
      userName: fullName,
      userRole: 'Public Applicant',
      action: 'SUBMIT_APPLICATION',
      entityType: 'APPLICATION',
      entityId: applicationId,
      details: { referenceNumber, submissionType, vacancyTitle, areaOfInterest },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    });

    // 9. Return clean response to candidate (never leaks internal notes or system IDs)
    res.json({
      success: true,
      referenceNumber,
      candidateName: fullName,
      submissionType,
      message: 'Application successfully transmitted and registered.'
    });

  } catch (err: any) {
    console.error('Application submission processing failed:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while processing your application. Please try again.'
    });
  }
});

// =========================================================================
// 2. CMS RESTRICTED ENDPOINTS
// =========================================================================

/**
 * GET /api/recruitment/overview
 * Real-time recruitment KPI metrics
 */
recruitmentRouter.get('/overview', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const totalApps = (db.prepare('SELECT COUNT(*) as count FROM applications WHERE deleted_at IS NULL').get() as any).count;
    const newApps = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'New' AND deleted_at IS NULL").get() as any).count;
    const underReview = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Under Review' AND deleted_at IS NULL").get() as any).count;
    const shortlisted = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Shortlisted' AND deleted_at IS NULL").get() as any).count;
    const interviews = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Interview' AND deleted_at IS NULL").get() as any).count;
    const offers = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Offered' AND deleted_at IS NULL").get() as any).count;
    const hired = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Hired' AND deleted_at IS NULL").get() as any).count;
    const rejected = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Rejected' AND deleted_at IS NULL").get() as any).count;
    const generalCv = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE submission_type = 'general' AND deleted_at IS NULL").get() as any).count;
    const talentPool = (db.prepare("SELECT COUNT(*) as count FROM applications WHERE talent_pool_consent = 1 AND deleted_at IS NULL").get() as any).count;

    const outboxPending = (db.prepare("SELECT COUNT(*) as count FROM email_outbox WHERE status = 'pending'").get() as any).count;
    const outboxFailed = (db.prepare("SELECT COUNT(*) as count FROM email_outbox WHERE status = 'failed'").get() as any).count;

    res.json({
      success: true,
      metrics: {
        totalApps,
        newApps,
        underReview,
        shortlisted,
        interviews,
        offers,
        hired,
        rejected,
        generalCv,
        talentPool,
        outboxPending,
        outboxFailed
      }
    });
  } catch (err: any) {
    console.error('Failed to load recruitment overview:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate recruitment overview.' });
  }
});

/**
 * GET /api/recruitment/vacancies/all
 * Full list of vacancies for CMS (Draft, Published, Closed) with counts
 */
recruitmentRouter.get('/vacancies/all', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const vacancies = db.prepare(`
      SELECT v.*,
             COUNT(a.id) as application_count
      FROM vacancies v
      LEFT JOIN applications a ON v.id = a.vacancy_id AND a.deleted_at IS NULL
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `).all() as any[];

    const formatted = vacancies.map((v) => ({
      ...v,
      responsibilities: v.responsibilities ? JSON.parse(v.responsibilities) : [],
      requirements: v.requirements ? JSON.parse(v.requirements) : []
    }));

    res.json({ success: true, vacancies: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve vacancies.' });
  }
});

/**
 * POST /api/recruitment/vacancies
 * Create new vacancy
 */
recruitmentRouter.post('/vacancies', requireRecruitmentAuth(['Recruitment Administrator', 'HR Reviewer']), (req: Request, res: Response) => {
  try {
    const { title, department, location, type, experience, salary_range, description, responsibilities, requirements, closing_date, status } = req.body;
    if (!title || !department || !description) {
      return res.status(400).json({ success: false, error: 'Title, department, and description are required.' });
    }

    const id = `c-${department.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO vacancies (
        id, title, department, location, type, experience, salary_range,
        description, responsibilities, requirements, closing_date, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      department,
      location || 'Abuja Head Office (CBD)',
      type || 'Full-Time',
      experience || '3+ Years Banking',
      salary_range || 'Competitive Scale',
      description,
      JSON.stringify(responsibilities || []),
      JSON.stringify(requirements || []),
      closing_date || null,
      status || 'Published',
      now,
      now
    );

    const user = (req as any).recruitmentUser;
    logAuditEvent({
      userName: user.name,
      userRole: user.role,
      action: 'CREATE_VACANCY',
      entityType: 'VACANCY',
      entityId: id,
      details: { title, department, status }
    });

    res.json({ success: true, id, message: 'Vacancy successfully created.' });
  } catch (err: any) {
    console.error('Error creating vacancy:', err);
    res.status(500).json({ success: false, error: 'Failed to create vacancy.' });
  }
});

/**
 * PUT /api/recruitment/vacancies/:id
 * Update vacancy or change state (Draft, Published, Closed)
 */
recruitmentRouter.put('/vacancies/:id', requireRecruitmentAuth(['Recruitment Administrator', 'HR Reviewer']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, department, location, type, experience, salary_range, description, responsibilities, requirements, closing_date, status } = req.body;

    const existing = db.prepare('SELECT id FROM vacancies WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Vacancy opening not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE vacancies SET
        title = ?, department = ?, location = ?, type = ?, experience = ?,
        salary_range = ?, description = ?, responsibilities = ?, requirements = ?,
        closing_date = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title,
      department,
      location,
      type,
      experience,
      salary_range,
      description,
      JSON.stringify(responsibilities || []),
      JSON.stringify(requirements || []),
      closing_date || null,
      status,
      now,
      id
    );

    const user = (req as any).recruitmentUser;
    logAuditEvent({
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE_VACANCY',
      entityType: 'VACANCY',
      entityId: id,
      details: { title, status }
    });

    res.json({ success: true, message: 'Vacancy successfully updated.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update vacancy.' });
  }
});

/**
 * GET /api/recruitment/applications
 * Server-side paginated, searchable, filterable applications list
 */
recruitmentRouter.get('/applications', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const {
      search,
      vacancyId,
      status,
      submissionType,
      reviewer,
      talentPoolOnly,
      page = '1',
      limit = '15',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses: string[] = ['a.deleted_at IS NULL'];
    const params: any[] = [];

    if (search && search.trim()) {
      whereClauses.push('(c.full_name LIKE ? OR c.email LIKE ? OR a.reference_number LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (vacancyId && vacancyId !== 'all') {
      whereClauses.push('a.vacancy_id = ?');
      params.push(vacancyId);
    }

    if (status && status !== 'all') {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    if (submissionType && submissionType !== 'all') {
      whereClauses.push('a.submission_type = ?');
      params.push(submissionType);
    }

    if (reviewer && reviewer !== 'all') {
      whereClauses.push('a.assigned_reviewer_name = ?');
      params.push(reviewer);
    }

    if (talentPoolOnly === 'true' || talentPoolOnly === '1') {
      whereClauses.push('a.talent_pool_consent = 1');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countSql = `
      SELECT COUNT(a.id) as total
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN vacancies v ON a.vacancy_id = v.id
      ${whereSql}
    `;
    const countResult = db.prepare(countSql).get(...params) as { total: number };
    const total = countResult ? countResult.total : 0;

    // Allowed sort columns
    const allowedSortColumns: Record<string, string> = {
      created_at: 'a.created_at',
      reference_number: 'a.reference_number',
      status: 'a.status',
      candidate_name: 'c.full_name'
    };
    const orderCol = allowedSortColumns[sortBy] || 'a.created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Data query
    const dataSql = `
      SELECT a.id, a.reference_number, a.submission_type, a.vacancy_id, a.area_of_interest,
             a.status, a.assigned_reviewer_id, a.assigned_reviewer_name, a.talent_pool_consent,
             a.created_at, a.retention_expiry,
             c.full_name as candidate_name, c.email as candidate_email, c.phone as candidate_phone,
             v.title as vacancy_title, v.department as vacancy_department,
             d.original_filename as cv_filename, d.scan_status as cv_scan_status
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN vacancies v ON a.vacancy_id = v.id
      LEFT JOIN application_documents d ON a.id = d.application_id
      ${whereSql}
      ORDER BY ${orderCol} ${direction}
      LIMIT ? OFFSET ?
    `;

    const applications = db.prepare(dataSql).all(...params, limitNum, offset);

    res.json({
      success: true,
      applications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err: any) {
    console.error('Error querying applications:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve applications.' });
  }
});

/**
 * GET /api/recruitment/applications/:id
 * Full single application dossier for review
 */
recruitmentRouter.get('/applications/:id', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const app = db.prepare(`
      SELECT a.*,
             c.full_name as candidate_name, c.email as candidate_email, c.phone as candidate_phone, c.linkedin_url,
             v.title as vacancy_title, v.department as vacancy_department, v.location as vacancy_location
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN vacancies v ON a.vacancy_id = v.id
      WHERE a.id = ? AND a.deleted_at IS NULL
    `).get(id) as any;

    if (!app) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    // Associated documents (CV)
    const documents = db.prepare(`
      SELECT id, original_filename, file_size_bytes, mime_type, file_sha256, scan_status, scan_notes, created_at
      FROM application_documents
      WHERE application_id = ?
    `).all(id);

    // Internal Notes (Attributed and timestamped)
    const notes = db.prepare(`
      SELECT id, author_name, author_role, note_text, created_at
      FROM application_notes
      WHERE application_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Status Audit History
    const statusHistory = db.prepare(`
      SELECT id, previous_status, new_status, changed_by_name, changed_by_role, comment, created_at
      FROM application_status_history
      WHERE application_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Outbox notification delivery logs
    const outboxEmails = db.prepare(`
      SELECT id, recipient, recipient_type, subject, status, attempts, last_attempt, error_message, created_at, sent_at
      FROM email_outbox
      WHERE application_id = ?
      ORDER BY created_at DESC
    `).all(id);

    res.json({
      success: true,
      application: {
        ...app,
        documents,
        notes,
        statusHistory,
        outboxEmails
      }
    });
  } catch (err: any) {
    console.error('Error fetching application dossier:', err);
    res.status(500).json({ success: false, error: 'Failed to load application dossier.' });
  }
});

/**
 * PATCH /api/recruitment/applications/:id/status
 * Update recruitment status (New -> Under Review -> Shortlisted -> Interview -> Offered -> Hired -> Rejected -> Withdrawn)
 */
recruitmentRouter.patch('/applications/:id/status', requireRecruitmentAuth(['Recruitment Administrator', 'HR Reviewer', 'Hiring Manager']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const ALLOWED_STATUSES = ['New', 'Under Review', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status '${status}'. Must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
    }

    const currentApp = db.prepare('SELECT status, reference_number FROM applications WHERE id = ?').get(id) as any;
    if (!currentApp) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const previousStatus = currentApp.status;
    const now = new Date().toISOString();
    const user = (req as any).recruitmentUser;

    // Update status
    db.prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    // Append to status history
    const historyId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO application_status_history (
        id, application_id, previous_status, new_status, changed_by_name,
        changed_by_role, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(historyId, id, previousStatus, status, user.name, user.role, comment || null, now);

    // Audit log
    logAuditEvent({
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE_APPLICATION_STATUS',
      entityType: 'APPLICATION',
      entityId: id,
      details: { referenceNumber: currentApp.reference_number, previousStatus, newStatus: status, comment }
    });

    res.json({
      success: true,
      previousStatus,
      newStatus: status,
      message: `Candidate status updated to '${status}'.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update application status.' });
  }
});

/**
 * PATCH /api/recruitment/applications/:id/reviewer
 * Assign or reassign internal reviewer
 */
recruitmentRouter.patch('/applications/:id/reviewer', requireRecruitmentAuth(['Recruitment Administrator', 'HR Reviewer']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewerId, reviewerName } = req.body;

    const currentApp = db.prepare('SELECT reference_number FROM applications WHERE id = ?').get(id) as any;
    if (!currentApp) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE applications SET assigned_reviewer_id = ?, assigned_reviewer_name = ?, updated_at = ? WHERE id = ?')
      .run(reviewerId || null, reviewerName || null, now, id);

    const user = (req as any).recruitmentUser;
    logAuditEvent({
      userName: user.name,
      userRole: user.role,
      action: 'ASSIGN_REVIEWER',
      entityType: 'APPLICATION',
      entityId: id,
      details: { referenceNumber: currentApp.reference_number, assignedTo: reviewerName }
    });

    res.json({ success: true, message: `Reviewer assigned to ${reviewerName || 'Unassigned'}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to assign reviewer.' });
  }
});

/**
 * POST /api/recruitment/applications/:id/notes
 * Add internal note to application dossier
 */
recruitmentRouter.post('/applications/:id/notes', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { noteText } = req.body;

    if (!noteText || !noteText.trim()) {
      return res.status(400).json({ success: false, error: 'Note text cannot be empty.' });
    }

    const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(id);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const user = (req as any).recruitmentUser;
    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO application_notes (id, application_id, author_id, author_name, author_role, note_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(noteId, id, user.id, user.name, user.role, noteText.trim(), now);

    res.json({
      success: true,
      note: {
        id: noteId,
        author_name: user.name,
        author_role: user.role,
        note_text: noteText.trim(),
        created_at: now
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save internal note.' });
  }
});

/**
 * GET /api/recruitment/applications/:id/cv
 * Authorized streaming of private CV file
 */
recruitmentRouter.get('/applications/:id/cv', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = db.prepare(`
      SELECT original_filename, storage_path, mime_type, file_size_bytes
      FROM application_documents
      WHERE application_id = ?
      LIMIT 1
    `).get(id) as any;

    if (!doc) {
      return res.status(404).json({ success: false, error: 'CV document record not found.' });
    }

    const fileData = getCvFile(doc.storage_path);
    if (!fileData.exists || !fileData.buffer) {
      return res.status(404).json({ success: false, error: 'Underlying document file missing from secure storage.' });
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader('Content-Length', fileData.buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    res.send(fileData.buffer);
  } catch (err: any) {
    console.error('Error streaming CV file:', err);
    res.status(500).json({ success: false, error: 'Failed to access CV document.' });
  }
});

/**
 * GET /api/recruitment/talent-pool
 * Dedicated view of talent-pool candidates with explicit consent
 */
recruitmentRouter.get('/talent-pool', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const talentCandidates = db.prepare(`
      SELECT a.id, a.reference_number, a.submission_type, a.area_of_interest, a.talent_pool_consent_at,
             a.talent_pool_notice_version, a.retention_expiry, a.status,
             c.full_name as candidate_name, c.email as candidate_email, c.phone as candidate_phone, c.linkedin_url,
             v.title as vacancy_title,
             d.original_filename as cv_filename
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN vacancies v ON a.vacancy_id = v.id
      LEFT JOIN application_documents d ON a.id = d.application_id
      WHERE a.talent_pool_consent = 1 AND a.deleted_at IS NULL
      ORDER BY a.talent_pool_consent_at DESC
    `).all();

    res.json({ success: true, candidates: talentCandidates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve talent pool.' });
  }
});

/**
 * GET /api/recruitment/outbox
 * Outbox delivery queue and status
 */
recruitmentRouter.get('/outbox', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const emails = db.prepare(`
      SELECT id, application_id, recipient, recipient_type, subject, status,
             attempts, max_attempts, last_attempt, error_message, created_at, sent_at
      FROM email_outbox
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, emails });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load outbox queue.' });
  }
});

/**
 * POST /api/recruitment/outbox/:id/retry
 * Manual retry for a specific pending/failed outbox email
 */
recruitmentRouter.post('/outbox/:id/retry', requireRecruitmentAuth(['Recruitment Administrator', 'HR Reviewer']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await retryOutboxEmail(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retry email transmission.' });
  }
});

/**
 * GET /api/recruitment/settings
 * Retrieve configurable recruitment settings
 */
recruitmentRouter.get('/settings', requireRecruitmentAuth(), (req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT key, value, updated_at FROM recruitment_settings').all() as any[];
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    res.json({ success: true, settings: map });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load recruitment settings.' });
  }
});

/**
 * PUT /api/recruitment/settings
 * Update recruitment settings (HR email recipient, retention days)
 */
recruitmentRouter.put('/settings', requireRecruitmentAuth(['Recruitment Administrator']), (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload.' });
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('INSERT INTO recruitment_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');

    for (const [k, v] of Object.entries(settings)) {
      if (typeof v === 'string') {
        updateStmt.run(k, v, now);
      }
    }

    const user = (req as any).recruitmentUser;
    logAuditEvent({
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTINGS',
      entityId: 'recruitment_settings',
      details: settings
    });

    res.json({ success: true, message: 'Recruitment settings updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
});

/**
 * DELETE /api/recruitment/applications/:id
 * Data subject erasure (Right to be Forgotten) or retention expiry purge
 */
recruitmentRouter.delete('/applications/:id', requireRecruitmentAuth(['Recruitment Administrator']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const app = db.prepare('SELECT reference_number, candidate_id FROM applications WHERE id = ?').get(id) as any;
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    // 1. Delete CV file from storage
    const doc = db.prepare('SELECT storage_path FROM application_documents WHERE application_id = ?').get(id) as any;
    if (doc && doc.storage_path) {
      deleteCvFile(doc.storage_path);
    }

    // 2. Anonymize/mark deleted in DB
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE applications
      SET deleted_at = ?, cover_note = '[REDACTED PURSUANT TO DATA ERASURE POLICY]', portfolio_url = null
      WHERE id = ?
    `).run(now, id);

    db.prepare('DELETE FROM application_documents WHERE application_id = ?').run(id);

    // 3. Log audit event
    const user = (req as any).recruitmentUser;
    logAuditEvent({
      userName: user.name,
      userRole: user.role,
      action: 'PURGE_APPLICATION',
      entityType: 'APPLICATION',
      entityId: id,
      details: { referenceNumber: app.reference_number, reason: 'Retention expiry / GDPR/NDPA erasure request' }
    });

    res.json({ success: true, message: `Application ${app.reference_number} and associated CV document permanently erased.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to purge application record.' });
  }
});

/**
 * GET /api/recruitment/audit
 * Immutable audit logs
 */
recruitmentRouter.get('/audit', requireRecruitmentAuth(['Recruitment Administrator']), (req: Request, res: Response) => {
  try {
    const logs = db.prepare(`
      SELECT id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at
      FROM audit_events
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load audit events.' });
  }
});

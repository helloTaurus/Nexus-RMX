import { db } from '../db.ts';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { logAuditEvent } from '../auth.ts';

/**
 * GET /api/hrms/appraisals/cycles
 * List all appraisal cycles with total appraisals count.
 */
export function listAppraisalCycles(req: Request, res: Response) {
  try {
    const cycles = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM employee_appraisals a WHERE a.cycle_id = c.id) as total_appraisals,
        (SELECT COUNT(*) FROM employee_appraisals a WHERE a.cycle_id = c.id AND a.status = 'Finalized') as completed_appraisals
      FROM appraisal_cycles c
      ORDER BY c.period_end DESC, c.created_at DESC
    `).all();

    return res.json({ success: true, cycles });
  } catch (err: any) {
    console.error('Failed to list appraisal cycles:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching appraisal cycles.', details: err.message });
  }
}

/**
 * POST /api/hrms/appraisals/cycles
 * Create a new performance appraisal cycle.
 */
export function createAppraisalCycle(req: Request, res: Response) {
  try {
    const { title, period_start, period_end, status = 'Active' } = req.body;

    if (!title || !period_start || !period_end) {
      return res.status(400).json({ success: false, error: 'Title, period start, and period end are required.' });
    }

    const id = `cycle_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO appraisal_cycles (id, title, period_start, period_end, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, period_start, period_end, status, now);

    return res.status(201).json({
      success: true,
      cycle: { id, title, period_start, period_end, status, created_at: now }
    });
  } catch (err: any) {
    console.error('Failed to create appraisal cycle:', err);
    return res.status(500).json({ success: false, error: 'Failed to create appraisal cycle.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/appraisals/cycles/:id
 * Update appraisal cycle status or dates.
 */
export function updateAppraisalCycle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, period_start, period_end, status } = req.body;

    const existing = db.prepare('SELECT id FROM appraisal_cycles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Appraisal cycle not found.' });
    }

    db.prepare(`
      UPDATE appraisal_cycles SET
        title = COALESCE(?, title),
        period_start = COALESCE(?, period_start),
        period_end = COALESCE(?, period_end),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(title || null, period_start || null, period_end || null, status || null, id);

    return res.json({ success: true, message: 'Appraisal cycle updated successfully.' });
  } catch (err: any) {
    console.error('Failed to update appraisal cycle:', err);
    return res.status(500).json({ success: false, error: 'Failed to update appraisal cycle.', details: err.message });
  }
}

/**
 * GET /api/hrms/appraisals
 * List employee appraisals with optional filtering.
 */
export function listAppraisals(req: Request, res: Response) {
  try {
    const { cycle_id, employee_id, reviewer_id, status } = req.query;

    let query = `
      SELECT 
        a.*,
        c.title as cycle_title,
        c.period_start,
        c.period_end,
        (e.first_name || ' ' || e.last_name) as employee_name,
        e.employee_number,
        e.official_email as employee_email,
        d.name as department_name,
        des.title as designation_title,
        des.cadre_level,
        (r.first_name || ' ' || r.last_name) as reviewer_name,
        (SELECT COUNT(*) FROM appraisal_kpis k WHERE k.appraisal_id = a.id) as kpi_count
      FROM employee_appraisals a
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employees r ON a.reviewer_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cycle_id) {
      query += ` AND a.cycle_id = ?`;
      params.push(cycle_id);
    }

    if (employee_id) {
      query += ` AND a.employee_id = ?`;
      params.push(employee_id);
    }

    if (reviewer_id) {
      query += ` AND a.reviewer_id = ?`;
      params.push(reviewer_id);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.created_at DESC`;

    const appraisals = db.prepare(query).all(...params);
    return res.json({ success: true, appraisals });
  } catch (err: any) {
    console.error('Failed to list appraisals:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching appraisals.', details: err.message });
  }
}

/**
 * GET /api/hrms/appraisals/:id
 * Retrieve appraisal dossier with all KPIs and scores.
 */
export function getAppraisalDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const appraisal = db.prepare(`
      SELECT 
        a.*,
        c.title as cycle_title,
        c.period_start,
        c.period_end,
        (e.first_name || ' ' || e.last_name) as employee_name,
        e.employee_number,
        e.official_email as employee_email,
        d.name as department_name,
        des.title as designation_title,
        des.cadre_level,
        (r.first_name || ' ' || r.last_name) as reviewer_name,
        r.official_email as reviewer_email
      FROM employee_appraisals a
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN employees r ON a.reviewer_id = r.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!appraisal) {
      return res.status(404).json({ success: false, error: 'Appraisal record not found.' });
    }

    const kpis = db.prepare(`
      SELECT * FROM appraisal_kpis
      WHERE appraisal_id = ?
      ORDER BY weightage_percent DESC, id ASC
    `).all(id);

    return res.json({
      success: true,
      appraisal,
      kpis
    });
  } catch (err: any) {
    console.error('Failed to get appraisal details:', err);
    return res.status(500).json({ success: false, error: 'Database error fetching appraisal details.', details: err.message });
  }
}

/**
 * POST /api/hrms/appraisals
 * Initialize an appraisal for an employee with custom or default KPIs.
 */
export function initializeAppraisal(req: Request, res: Response) {
  try {
    const { cycle_id, employee_id, reviewer_id, kpis } = req.body;

    if (!cycle_id || !employee_id) {
      return res.status(400).json({ success: false, error: 'cycle_id and employee_id are required.' });
    }

    // Check if appraisal already exists for this cycle & employee
    const existing = db.prepare('SELECT id FROM employee_appraisals WHERE cycle_id = ? AND employee_id = ?').get(cycle_id, employee_id) as any;
    if (existing) {
      return res.status(400).json({ success: false, error: 'An appraisal has already been created for this employee in this cycle.' });
    }

    const emp = db.prepare('SELECT id, reporting_manager_id, first_name, last_name FROM employees WHERE id = ?').get(employee_id) as any;
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found.' });
    }

    const appraisalId = `appr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const effectiveReviewer = reviewer_id || emp.reporting_manager_id || null;

    db.prepare(`
      INSERT INTO employee_appraisals (
        id, cycle_id, employee_id, reviewer_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'Self-Review', ?, ?)
    `).run(appraisalId, cycle_id, employee_id, effectiveReviewer, now, now);

    // Default KPI templates if none provided
    const targetKpis = Array.isArray(kpis) && kpis.length > 0 ? kpis : [
      { name: 'Core Operational Execution & SLA Delivery', weight: 35, target: 'Maintain 95%+ prompt resolution rate.' },
      { name: 'Regulatory Compliance & Risk Adherence', weight: 25, target: 'Zero procedural exceptions or audit non-conformances.' },
      { name: 'Team Collaboration & Cross-Functional Impact', weight: 20, target: 'Active participation in strategic goals and knowledge sharing.' },
      { name: 'Professional Growth & Upskilling Objectives', weight: 20, target: 'Complete mandatory compliance and continuous learning modules.' }
    ];

    const insertKpi = db.prepare(`
      INSERT INTO appraisal_kpis (id, appraisal_id, kpi_name, weightage_percent, target_metric, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < targetKpis.length; i++) {
      const k = targetKpis[i];
      insertKpi.run(`kpi_${appraisalId}_${i + 1}`, appraisalId, k.name, k.weight || 25, k.target || 'Meet assigned KPIs', now);
    }

    return res.status(201).json({
      success: true,
      message: 'Appraisal initialized successfully.',
      appraisalId
    });
  } catch (err: any) {
    console.error('Failed to initialize appraisal:', err);
    return res.status(500).json({ success: false, error: 'Failed to initialize appraisal.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/appraisals/:id/self-evaluate
 * Employee completes their self-review and submits to manager.
 */
export function selfEvaluateAppraisal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { self_rating, self_comments, kpi_scores } = req.body;

    const appraisal = db.prepare('SELECT id, status, employee_id FROM employee_appraisals WHERE id = ?').get(id) as any;
    if (!appraisal) {
      return res.status(404).json({ success: false, error: 'Appraisal not found.' });
    }

    const now = new Date().toISOString();

    // Update KPIs self scores if provided
    if (Array.isArray(kpi_scores)) {
      const updateKpi = db.prepare(`
        UPDATE appraisal_kpis 
        SET self_score = ?, comments = COALESCE(?, comments)
        WHERE id = ? AND appraisal_id = ?
      `);
      for (const item of kpi_scores) {
        if (item.id) {
          updateKpi.run(item.self_score ?? null, item.comments ?? null, item.id, id);
        }
      }
    }

    // Update appraisal header
    db.prepare(`
      UPDATE employee_appraisals SET
        self_rating = ?,
        self_comments = ?,
        status = 'Manager-Review',
        submitted_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      self_rating !== undefined ? Number(self_rating) : null,
      self_comments || null,
      now,
      now,
      id
    );

    return res.json({
      success: true,
      message: 'Self-evaluation submitted to line manager for review.'
    });
  } catch (err: any) {
    console.error('Failed to submit self-evaluation:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit self-evaluation.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/appraisals/:id/manager-review
 * Line manager scores the employee's performance and passes to HR calibration.
 */
export function managerReviewAppraisal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { manager_rating, manager_comments, kpi_scores } = req.body;

    const appraisal = db.prepare('SELECT id, status, employee_id FROM employee_appraisals WHERE id = ?').get(id) as any;
    if (!appraisal) {
      return res.status(404).json({ success: false, error: 'Appraisal not found.' });
    }

    const now = new Date().toISOString();

    // Update KPIs manager scores if provided
    if (Array.isArray(kpi_scores)) {
      const updateKpi = db.prepare(`
        UPDATE appraisal_kpis 
        SET manager_score = ?, comments = COALESCE(?, comments)
        WHERE id = ? AND appraisal_id = ?
      `);
      for (const item of kpi_scores) {
        if (item.id) {
          updateKpi.run(item.manager_score ?? null, item.comments ?? null, item.id, id);
        }
      }
    }

    db.prepare(`
      UPDATE employee_appraisals SET
        manager_rating = ?,
        manager_comments = ?,
        status = 'HR-Calibration',
        updated_at = ?
      WHERE id = ?
    `).run(
      manager_rating !== undefined ? Number(manager_rating) : null,
      manager_comments || null,
      now,
      id
    );

    return res.json({
      success: true,
      message: 'Manager evaluation recorded and routed to HR for final calibration.'
    });
  } catch (err: any) {
    console.error('Failed to submit manager review:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit manager review.', details: err.message });
  }
}

/**
 * PATCH /api/hrms/appraisals/:id/finalize
 * HR Administrator finalizes rating, calibration, and strategic action (promotion, bonus, PIP).
 */
export function finalizeAppraisal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { hr_final_score, hr_recommendation } = req.body;

    const appraisal = db.prepare('SELECT id, employee_id FROM employee_appraisals WHERE id = ?').get(id) as any;
    if (!appraisal) {
      return res.status(404).json({ success: false, error: 'Appraisal not found.' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE employee_appraisals SET
        hr_final_score = ?,
        hr_recommendation = ?,
        status = 'Finalized',
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      hr_final_score !== undefined ? Number(hr_final_score) : null,
      hr_recommendation || 'None',
      now,
      now,
      id
    );

    logAuditEvent({
      userName: (req as any).recruitmentUser?.name || 'HR Admin',
      userRole: (req as any).recruitmentUser?.role || 'HR Administrator',
      action: 'finalize_performance_appraisal',
      entityType: 'employee_appraisal',
      entityId: id,
      details: { hr_final_score, hr_recommendation },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Performance appraisal finalized and archived.'
    });
  } catch (err: any) {
    console.error('Failed to finalize appraisal:', err);
    return res.status(500).json({ success: false, error: 'Failed to finalize appraisal.', details: err.message });
  }
}

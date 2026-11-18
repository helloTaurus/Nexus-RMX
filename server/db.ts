import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Resolve persistent database directory (configurable for Render persistent disk)
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'nexus_recruitment.db');

declare global {
  var __nexus_db: DatabaseSync | undefined;
}

if (!globalThis.__nexus_db) {
  globalThis.__nexus_db = new DatabaseSync(DB_PATH);
  globalThis.__nexus_db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
}

export const db = globalThis.__nexus_db;


export function initDatabase() {
  db.exec(`
    -- 1. Vacancies Table
    CREATE TABLE IF NOT EXISTS vacancies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      experience TEXT NOT NULL,
      salary_range TEXT NOT NULL,
      description TEXT NOT NULL,
      responsibilities TEXT,
      requirements TEXT,
      closing_date TEXT,
      status TEXT NOT NULL DEFAULT 'Published', -- 'Draft', 'Published', 'Closed'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
    CREATE INDEX IF NOT EXISTS idx_vacancies_dept ON vacancies(department);

    -- 2. Candidates Table
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      linkedin_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

    -- 3. Applications Table
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      reference_number TEXT UNIQUE NOT NULL,
      candidate_id TEXT NOT NULL,
      submission_type TEXT NOT NULL, -- 'vacancy' | 'general'
      vacancy_id TEXT,
      area_of_interest TEXT,
      cover_note TEXT,
      portfolio_url TEXT,
      status TEXT NOT NULL DEFAULT 'New', -- 'New', 'Under Review', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn'
      assigned_reviewer_id TEXT,
      assigned_reviewer_name TEXT,
      idempotency_key TEXT UNIQUE,
      privacy_notice_version TEXT NOT NULL DEFAULT 'v2026.1',
      talent_pool_consent INTEGER NOT NULL DEFAULT 0,
      talent_pool_consent_at TEXT,
      talent_pool_notice_version TEXT,
      retention_expiry TEXT NOT NULL,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_apps_ref ON applications(reference_number);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_apps_type ON applications(submission_type);
    CREATE INDEX IF NOT EXISTS idx_apps_talent ON applications(talent_pool_consent);
    CREATE INDEX IF NOT EXISTS idx_apps_created ON applications(created_at);

    -- 4. Application Documents (CVs)
    CREATE TABLE IF NOT EXISTS application_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_sha256 TEXT NOT NULL,
      scan_status TEXT NOT NULL DEFAULT 'clean', -- 'quarantined', 'scanning', 'clean', 'infected', 'unavailable'
      scan_notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_docs_app ON application_documents(application_id);

    -- 5. Internal Notes Table
    CREATE TABLE IF NOT EXISTS application_notes (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notes_app ON application_notes(application_id);

    -- 6. Status History Table
    CREATE TABLE IF NOT EXISTS application_status_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      changed_by_role TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_app ON application_status_history(application_id);

    -- 7. Durable Email Outbox
    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      recipient_type TEXT NOT NULL, -- 'hr' | 'applicant'
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      last_attempt TEXT,
      error_message TEXT,
      provider_message_id TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_status ON email_outbox(status);

    -- 8. Recruitment Settings
    CREATE TABLE IF NOT EXISTS recruitment_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 9. Audit Events
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(created_at);

    -- =========================================================================
    -- 10. HRMS: Departments (Nexus People)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      head_employee_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dept_code ON departments(code);

    -- 11. HRMS: Designations / Job Cadres
    CREATE TABLE IF NOT EXISTS designations (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      title TEXT NOT NULL,
      cadre_level TEXT NOT NULL, -- 'Entry', 'Mid-Level', 'Senior', 'Lead / Manager', 'Executive'
      grade_code TEXT NOT NULL,  -- 'L1', 'L2', 'L3', 'M1', 'M2', 'EXEC'
      daily_expense_cap REAL NOT NULL DEFAULT 25000, -- Zoho Expense per-diem limit (NGN)
      created_at TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_desig_dept ON designations(department_id);

    -- 12. HRMS: Employees (Core Workforce Registry)
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_number TEXT UNIQUE NOT NULL, -- 'NX-0001', 'NX-0002'...
      candidate_id TEXT,                    -- Reference to recruitment candidate
      application_id TEXT,                  -- Reference to original application
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      official_email TEXT UNIQUE NOT NULL,
      personal_email TEXT,
      phone TEXT NOT NULL,
      gender TEXT,
      date_of_birth TEXT,
      date_of_joining TEXT NOT NULL,
      employment_type TEXT NOT NULL DEFAULT 'Full-Time', -- 'Full-Time', 'Contract', 'Probation', 'Intern'
      employment_status TEXT NOT NULL DEFAULT 'Active',   -- 'Active', 'Probation', 'Suspended', 'On Leave', 'Resigned', 'Terminated'
      department_id TEXT NOT NULL,
      designation_id TEXT NOT NULL,
      reporting_manager_id TEXT,
      branch_location TEXT NOT NULL DEFAULT 'Abuja Head Office (CBD)',
      salary_monthly REAL NOT NULL DEFAULT 0,
      bank_name TEXT,
      bank_account_number TEXT,
      bvn_nin_masked TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      emergency_contact_relationship TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
      FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_emp_num ON employees(employee_number);
    CREATE INDEX IF NOT EXISTS idx_emp_email ON employees(official_email);
    CREATE INDEX IF NOT EXISTS idx_emp_status ON employees(employment_status);
    CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department_id);

    -- 13. HRMS: Employee Documents & Onboarding Vault
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      document_type TEXT NOT NULL, -- 'CV / Resume', 'Offer Letter', 'Signed NDA', 'Guarantor Form 1', 'Guarantor Form 2', 'NYSC Certificate', 'Degree Certificate', 'Government ID', 'Passport Photo', 'Medical Report'
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_sha256 TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Verified', 'Rejected'
      verified_by TEXT,
      verified_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_emp_doc ON employee_documents(employee_id);

    -- 14. HRMS: Leave Types (Zoho People Time-Off)
    CREATE TABLE IF NOT EXISTS leave_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      default_days_per_year INTEGER NOT NULL,
      requires_documentation INTEGER NOT NULL DEFAULT 0
    );

    -- 15. HRMS: Employee Leave Balances
    CREATE TABLE IF NOT EXISTS employee_leave_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      entitled_days REAL NOT NULL,
      used_days REAL NOT NULL DEFAULT 0,
      pending_days REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_leave_bal ON employee_leave_balances(employee_id, year);

    -- 16. HRMS: Leave Requests
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_requested REAL NOT NULL,
      reason TEXT NOT NULL,
      handover_notes TEXT,
      relief_employee_id TEXT,
      status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Cancelled'
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_requests(employee_id);
    CREATE INDEX IF NOT EXISTS idx_leave_stat ON leave_requests(status);

    -- =========================================================================
    -- 17. HRMS: Expense Claims (Zoho Expense)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS expense_claims (
      id TEXT PRIMARY KEY,
      claim_number TEXT UNIQUE NOT NULL, -- 'EXP-2026-0001'
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      purpose TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Submitted', 'Line Manager Approved', 'Finance Approved', 'Reimbursed', 'Rejected'
      current_approver_role TEXT,
      submitted_at TEXT,
      settled_at TEXT,
      rejection_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_claim_emp ON expense_claims(employee_id);
    CREATE INDEX IF NOT EXISTS idx_claim_num ON expense_claims(claim_number);
    CREATE INDEX IF NOT EXISTS idx_claim_stat ON expense_claims(status);

    -- 18. HRMS: Expense Items
    CREATE TABLE IF NOT EXISTS expense_items (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Depot Inspection Logistics', 'Client Meeting', 'Fuel & Transport', 'Stationery', 'Accommodation'
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      merchant_name TEXT NOT NULL,
      description TEXT,
      receipt_document_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (claim_id) REFERENCES expense_claims(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_item_claim ON expense_items(claim_id);

    -- 19. HRMS: Expense Receipts
    CREATE TABLE IF NOT EXISTS expense_receipts (
      id TEXT PRIMARY KEY,
      expense_item_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_sha256 TEXT NOT NULL,
      scan_status TEXT NOT NULL DEFAULT 'clean',
      created_at TEXT NOT NULL,
      FOREIGN KEY (expense_item_id) REFERENCES expense_items(id) ON DELETE CASCADE
    );

    -- =========================================================================
    -- 20. HRMS: User Accounts (Employee Self-Service & HR Credentials)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS employee_accounts (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL, -- official email or employee number
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Employee', -- 'Employee', 'Line Manager', 'HR Reviewer', 'HR Administrator'
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_acc_emp ON employee_accounts(employee_id);
    CREATE INDEX IF NOT EXISTS idx_acc_user ON employee_accounts(username);

    -- =========================================================================
    -- 21. HRMS: Performance Appraisal Cycles
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS appraisal_cycles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active', -- 'Draft', 'Active', 'Reviewing', 'Completed', 'Archived'
      created_at TEXT NOT NULL
    );

    -- 22. HRMS: Employee Performance Appraisals
    CREATE TABLE IF NOT EXISTS employee_appraisals (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      reviewer_id TEXT,
      self_rating REAL, -- 1.0 to 5.0
      self_comments TEXT,
      manager_rating REAL, -- 1.0 to 5.0
      manager_comments TEXT,
      hr_final_score REAL, -- 1.0 to 5.0
      hr_recommendation TEXT, -- 'Retain & Bonus', 'Promote Cadre', 'Salary Increment', 'Performance Improvement Plan (PIP)', 'None'
      status TEXT NOT NULL DEFAULT 'Self-Review', -- 'Self-Review', 'Manager-Review', 'HR-Calibration', 'Finalized'
      submitted_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_appr_cycle ON employee_appraisals(cycle_id);
    CREATE INDEX IF NOT EXISTS idx_appr_emp ON employee_appraisals(employee_id);
    CREATE INDEX IF NOT EXISTS idx_appr_stat ON employee_appraisals(status);

    -- 23. HRMS: Appraisal Key Performance Indicators (KPIs) & Target Metrics
    CREATE TABLE IF NOT EXISTS appraisal_kpis (
      id TEXT PRIMARY KEY,
      appraisal_id TEXT NOT NULL,
      kpi_name TEXT NOT NULL,
      weightage_percent INTEGER NOT NULL DEFAULT 20,
      target_metric TEXT NOT NULL,
      self_score REAL, -- 1.0 to 5.0
      manager_score REAL, -- 1.0 to 5.0
      comments TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (appraisal_id) REFERENCES employee_appraisals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_kpi_appr ON appraisal_kpis(appraisal_id);

    -- =========================================================================
    -- 24. HRMS: Granular System Roles & Access Permissions
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS system_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL, -- JSON array of capability keys
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default settings if missing
  const checkSetting = db.prepare('SELECT value FROM recruitment_settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT OR IGNORE INTO recruitment_settings (key, value, updated_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();

  const defaultSettings: Record<string, string> = {
    hr_notification_email: 'hr@nexusfinanceltd.com',
    retention_unsuccessful_days: '180',
    retention_general_cv_days: '365',
    retention_talent_pool_days: '730',
    privacy_notice_version: 'v2026.1',
    talent_pool_notice_version: 'v2026.1',
    smtp_enabled: 'false',
    smtp_host: 'smtp.nexusfinanceltd.com',
    smtp_port: '587',
    smtp_user: 'recruitment@nexusfinanceltd.com',
    smtp_from: 'Nexus Human Capital <hr@nexusfinanceltd.com>',
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, v, now);
  }

  // Seed existing vacancies if table is empty
  const vacancyCount = db.prepare('SELECT COUNT(*) as count FROM vacancies').get() as { count: number };
  if (vacancyCount.count === 0) {
    const insertVacancy = db.prepare(`
      INSERT INTO vacancies (
        id, title, department, location, type, experience, salary_range,
        description, responsibilities, requirements, closing_date, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const INITIAL_ROLES = [
      {
        id: 'c-risk-01',
        title: 'Senior Credit Risk & Underwriting Analyst',
        department: 'Credit Risk & Underwriting',
        location: 'Abuja Head Office (CBD)',
        type: 'Full-Time',
        experience: '4 - 7 Years Banking',
        salaryRange: 'Competitive Tier-1 Scale',
        description: 'Lead institutional credit risk evaluations, commercial portfolio audits, and algorithmic appraisal of cash-flow loans for public sector and corporate borrowers.',
        responsibilities: [
          'Perform deep-dive financial analysis on commercial and individual credit applications.',
          'Formulate and validate automated scorecards for Suremoney and Nexus Credit facilities.',
          'Liaise directly with credit bureaus and the National Cooperative Financing Agency.',
          'Execute risk mitigation strategies for corporate invoice discounting portfolios.'
        ],
        requirements: [
          'B.Sc / HND in Banking, Finance, Economics, or Quantitative discipline.',
          'Proven experience in Tier-1 commercial bank or microfinance credit desk.',
          'Advanced modeling capability in Excel, SQL, or Python financial packages.',
          'Deep understanding of CBN guidelines and Nigerian lending frameworks.'
        ],
        closingDate: '2026-12-31'
      },
      {
        id: 'c-ops-02',
        title: 'Branch Operations & Liquidity Manager',
        department: 'Operations & Branch',
        location: 'Abuja Central / Regional Hubs',
        type: 'Full-Time',
        experience: '5+ Years Management',
        salaryRange: 'Benchmark Scale + Profit Share',
        description: 'Oversee day-to-day vault liquidity, interbank settlement clearing, branch regulatory compliance, and rapid 15-minute customer loan disbursals.',
        responsibilities: [
          'Direct end-to-end branch loan documentation and disbursement operations.',
          'Ensure 100% adherence to KYC, AML, and customer confidentiality standards.',
          'Supervise documentation intake for Car-for-Cash and Travel Financing facilities.',
          'Drive customer NPS scores and resolution of client inquiries.'
        ],
        requirements: [
          'Demonstrated leadership record in commercial branch banking operations.',
          'Impeccable integrity and audit track record with regulatory bodies.',
          'Strong crisis management and empathetic stakeholder resolution skills.'
        ],
        closingDate: '2026-11-30'
      },
      {
        id: 'c-dev-03',
        title: 'Senior Fintech Backend Architect (Node.js / Cloud)',
        department: 'Fintech & Engineering',
        location: 'Abuja / Remote Nigeria',
        type: 'Full-Time / Hybrid',
        experience: '4+ Years Distributed Systems',
        salaryRange: 'Above Market Equity + Tech Allowance',
        description: 'Architect resilient financial microservices, direct payment gateway switches, IPPIS/Remita payroll webhooks, and zero-trust cloud infrastructure.',
        responsibilities: [
          'Design and maintain high-throughput transaction routing services.',
          'Integrate interbank NIBSS instant payment (NIP) and Remita automated deduction APIs.',
          'Implement zero-trust security postures across production data stores.'
        ],
        requirements: [
          'Extensive experience with Node.js, TypeScript, PostgreSQL, and Redis.',
          'Track record of building PCI-DSS or ISO-27001 compliant banking microservices.',
          'Familiarity with event-driven architectures and message queues.'
        ],
        closingDate: '2026-12-15'
      },
      {
        id: 'c-sales-04',
        title: 'Institutional Relationship Director (Federal Commands)',
        department: 'Institutional Sales',
        location: 'Abuja (FCT) & National Command Liaison',
        type: 'Full-Time',
        experience: '6+ Years Public Sector',
        salaryRange: 'Executive Base + Performance Bonus',
        description: 'Develop and steward executive credit partnerships across paramilitary formations, federal ministries, departments, and government cooperative bodies.',
        responsibilities: [
          'Manage high-level relationships with federal MDA cooperative executives.',
          'Structure bespoke institutional payroll liquidity facilities.',
          'Lead institutional briefings and presentation roadshows.'
        ],
        requirements: [
          'Established network and professional credibility across Nigerian public sector institutions.',
          'Superior negotiation, diplomatic presentation, and contract structuring abilities.'
        ],
        closingDate: '2026-12-31'
      }
    ];

    for (const role of INITIAL_ROLES) {
      insertVacancy.run(
        role.id,
        role.title,
        role.department,
        role.location,
        role.type,
        role.experience,
        role.salaryRange,
        role.description,
        JSON.stringify(role.responsibilities),
        JSON.stringify(role.requirements),
        role.closingDate,
        'Published',
        now,
        now
      );
    }
  }

  // =========================================================================
  // Seed HRMS Departments & Designations if empty
  // =========================================================================
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
  if (deptCount.count === 0) {
    const insertDept = db.prepare(`
      INSERT INTO departments (id, name, code, description, head_employee_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertDesig = db.prepare(`
      INSERT INTO designations (id, department_id, title, cadre_level, grade_code, daily_expense_cap, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const DEPARTMENTS = [
      {
        id: 'dept-hcm',
        name: 'Human Capital Management',
        code: 'HCM',
        description: 'Talent acquisition, employee lifecycle, workforce relations and performance appraisal.',
        designations: [
          { id: 'desig-hcm-head', title: 'Head of Human Capital', cadre_level: 'Executive', grade_code: 'EXEC', daily_expense_cap: 75000 },
          { id: 'desig-hcm-ops', title: 'HR Operations & Onboarding Specialist', cadre_level: 'Mid-Level', grade_code: 'L2', daily_expense_cap: 30000 },
          { id: 'desig-hcm-talent', title: 'Talent Acquisition Lead', cadre_level: 'Senior', grade_code: 'L3', daily_expense_cap: 35000 }
        ]
      },
      {
        id: 'dept-credit',
        name: 'Credit Risk & Underwriting',
        code: 'CRK',
        description: 'Commercial credit assessment, collateral inspection, loan scoring and debt portfolio underwriting.',
        designations: [
          { id: 'desig-crk-mgr', title: 'Credit Portfolio Manager', cadre_level: 'Lead / Manager', grade_code: 'M1', daily_expense_cap: 50000 },
          { id: 'desig-crk-snr', title: 'Senior Credit Risk Analyst', cadre_level: 'Senior', grade_code: 'L3', daily_expense_cap: 40000 },
          { id: 'desig-crk-insp', title: 'Collateral & Vehicle Depot Inspector', cadre_level: 'Mid-Level', grade_code: 'L2', daily_expense_cap: 35000 },
          { id: 'desig-crk-off', title: 'Credit Processing Officer', cadre_level: 'Entry', grade_code: 'L1', daily_expense_cap: 20000 }
        ]
      },
      {
        id: 'dept-ops',
        name: 'Operations & Branch Banking',
        code: 'OPS',
        description: 'Retail branch network, loan disbursement settlements, and customer service desks.',
        designations: [
          { id: 'desig-ops-mgr', title: 'Branch Operations Manager', cadre_level: 'Lead / Manager', grade_code: 'M1', daily_expense_cap: 50000 },
          { id: 'desig-ops-cust', title: 'Customer Experience & Loan Officer', cadre_level: 'Entry', grade_code: 'L1', daily_expense_cap: 20000 },
          { id: 'desig-ops-cash', title: 'Cashier & Settlement Specialist', cadre_level: 'Entry', grade_code: 'L1', daily_expense_cap: 20000 }
        ]
      },
      {
        id: 'dept-treasury',
        name: 'Treasury & Wealth Management',
        code: 'TRS',
        description: 'Institutional liquidity management, fixed income placements and high-yield deposits.',
        designations: [
          { id: 'desig-trs-mgr', title: 'Institutional Portfolio Manager', cadre_level: 'Lead / Manager', grade_code: 'M1', daily_expense_cap: 50000 },
          { id: 'desig-trs-snr', title: 'Fixed Income & Liquidity Analyst', cadre_level: 'Mid-Level', grade_code: 'L2', daily_expense_cap: 35000 }
        ]
      },
      {
        id: 'dept-tech',
        name: 'Technology & Information Security',
        code: 'TECH',
        description: 'Core banking platform, payment integration infrastructure and cybersecurity governance.',
        designations: [
          { id: 'desig-tech-snr', title: 'Senior Core Banking Backend Engineer', cadre_level: 'Senior', grade_code: 'L3', daily_expense_cap: 40000 },
          { id: 'desig-tech-sys', title: 'IT Infrastructure & Network Admin', cadre_level: 'Mid-Level', grade_code: 'L2', daily_expense_cap: 30000 }
        ]
      },
      {
        id: 'dept-legal',
        name: 'Legal, Audit & Compliance',
        code: 'LGL',
        description: 'CBN statutory compliance, contract perfection, NDPA compliance, and internal financial audit.',
        designations: [
          { id: 'desig-lgl-csl', title: 'Regulatory Compliance Counsel', cadre_level: 'Senior', grade_code: 'L3', daily_expense_cap: 40000 },
          { id: 'desig-lgl-aud', title: 'Internal Audit & Risk Officer', cadre_level: 'Mid-Level', grade_code: 'L2', daily_expense_cap: 35000 }
        ]
      }
    ];

    for (const d of DEPARTMENTS) {
      insertDept.run(d.id, d.name, d.code, d.description, null, now);
      for (const des of d.designations) {
        insertDesig.run(des.id, d.id, des.title, des.cadre_level, des.grade_code, des.daily_expense_cap, now);
      }
    }
  }

  // =========================================================================
  // Seed Leave Types if empty (Zoho People Time-Off)
  // =========================================================================
  const leaveCount = db.prepare('SELECT COUNT(*) as count FROM leave_types').get() as { count: number };
  if (leaveCount.count === 0) {
    const insertLeaveType = db.prepare(`
      INSERT INTO leave_types (id, name, default_days_per_year, requires_documentation)
      VALUES (?, ?, ?, ?)
    `);

    const LEAVE_TYPES = [
      { id: 'leave-annual', name: 'Annual Leave', days: 20, docs: 0 },
      { id: 'leave-sick', name: 'Sick / Medical Leave', days: 10, docs: 1 },
      { id: 'leave-casual', name: 'Casual / Emergency Leave', days: 5, docs: 0 },
      { id: 'leave-maternity', name: 'Maternity Leave', days: 90, docs: 1 },
      { id: 'leave-paternity', name: 'Paternity Leave', days: 14, docs: 1 },
      { id: 'leave-study', name: 'Study & Professional Exam Leave', days: 5, docs: 1 }
    ];

    for (const lt of LEAVE_TYPES) {
      insertLeaveType.run(lt.id, lt.name, lt.days, lt.docs);
    }
  }

  // =========================================================================
  // Seed Foundational Head of HR Employee if empty
  // =========================================================================
  const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
  if (empCount.count === 0) {
    const insertEmp = db.prepare(`
      INSERT INTO employees (
        id, employee_number, candidate_id, application_id, first_name, last_name,
        official_email, personal_email, phone, gender, date_of_birth, date_of_joining,
        employment_type, employment_status, department_id, designation_id,
        reporting_manager_id, branch_location, salary_monthly, bank_name,
        bank_account_number, bvn_nin_masked, emergency_contact_name,
        emergency_contact_phone, emergency_contact_relationship, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const HR_LEAD_ID = 'emp_amina_bello';
    insertEmp.run(
      HR_LEAD_ID,
      'NX-0001',
      null,
      null,
      'Dr. Amina',
      'Bello',
      'amina.bello@nexusfinanceltd.com',
      'amina.bello.phd@gmail.com',
      '+234 802 345 6789',
      'Female',
      '1985-04-18',
      '2024-01-15',
      'Full-Time',
      'Active',
      'dept-hcm',
      'desig-hcm-head',
      null,
      'Abuja Head Office (CBD)',
      1450000,
      'Access Bank Plc',
      '0123456789',
      '223***891',
      'Alhaji Farouk Bello',
      '+234 803 111 2233',
      'Spouse',
      now,
      now
    );

    // Update HCM department head
    db.prepare('UPDATE departments SET head_employee_id = ? WHERE id = ?').run(HR_LEAD_ID, 'dept-hcm');

    // Initialize leave balance for HR lead
    const leaveTypes = db.prepare('SELECT id, default_days_per_year FROM leave_types').all() as { id: string; default_days_per_year: number }[];
    const insertBal = db.prepare(`
      INSERT INTO employee_leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const currentYear = new Date().getFullYear();
    for (const lt of leaveTypes) {
      insertBal.run(
        `bal_${HR_LEAD_ID}_${lt.id}_${currentYear}`,
        HR_LEAD_ID,
        lt.id,
        currentYear,
        lt.default_days_per_year,
        0,
        0
      );
    }
  }

  // =========================================================================
  // Seed Granular System Roles if missing
  // =========================================================================
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO system_roles (id, name, description, permissions, is_system, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const DEFAULT_ROLES = [
    {
      id: 'super_admin',
      name: 'Super Administrator',
      description: 'Master administrative access with rights to create roles, configure permissions, and manage all system modules.',
      permissions: [
        'manage_roles',
        'manage_system',
        'manage_employees',
        'onboard_employee',
        'edit_employee',
        'offboard_employee',
        'manage_departments',
        'approve_leaves',
        'request_leaves',
        'initiate_appraisals',
        'review_appraisals',
        'self_appraisal',
        'manage_expenses',
        'approve_expenses',
        'disburse_expenses',
        'submit_expenses',
        'view_audit_logs'
      ],
      is_system: 1
    },
    {
      id: 'system_admin',
      name: 'System Administrator',
      description: 'Technical administrator responsible for system configurations, accounts maintenance, and audit trails.',
      permissions: [
        'manage_system',
        'manage_roles',
        'view_audit_logs',
        'manage_accounts'
      ],
      is_system: 1
    },
    {
      id: 'hr_manager',
      name: 'HR Manager',
      description: 'Human Capital Manager handling workforce oversight, leave approvals, appraisal calibrations, and organizational structures.',
      permissions: [
        'manage_employees',
        'onboard_employee',
        'edit_employee',
        'offboard_employee',
        'manage_departments',
        'approve_leaves',
        'request_leaves',
        'initiate_appraisals',
        'review_appraisals',
        'self_appraisal',
        'submit_expenses',
        'approve_expenses'
      ],
      is_system: 1
    },
    {
      id: 'hr_staff',
      name: 'HR Staff',
      description: 'Human Capital operational team member who handles employee onboarding entry and basic staff assistance.',
      permissions: [
        'manage_employees',
        'onboard_employee',
        'request_leaves',
        'self_appraisal',
        'submit_expenses'
      ],
      is_system: 1
    },
    {
      id: 'finance_admin',
      name: 'Finance & Expense Administrator',
      description: 'Finance specialist responsible for expense verification, approval, per-diem compliance, and fund disbursement.',
      permissions: [
        'manage_expenses',
        'approve_expenses',
        'disburse_expenses',
        'request_leaves',
        'self_appraisal',
        'submit_expenses'
      ],
      is_system: 1
    },
    {
      id: 'employee',
      name: 'Employee / Staff',
      description: 'Standard staff member with self-service rights: view personal profile, request leave, submit self-appraisal, and file expense claims.',
      permissions: [
        'request_leaves',
        'self_appraisal',
        'submit_expenses',
        'view_own_profile'
      ],
      is_system: 1
    }
  ];

  for (const r of DEFAULT_ROLES) {
    insertRole.run(r.id, r.name, r.description, JSON.stringify(r.permissions), r.is_system, now);
  }

  // =========================================================================
  // Seed Default Employee Accounts if missing (Default password: nexus2026)
  // =========================================================================
  const employeesList = db.prepare('SELECT id, official_email, employee_number, department_id FROM employees').all() as any[];
  const checkAccount = db.prepare('SELECT id FROM employee_accounts WHERE employee_id = ?');
  const insertAccount = db.prepare(`
    INSERT OR IGNORE INTO employee_accounts (id, employee_id, username, password_hash, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  // Default hash for 'nexus2026'
  const defaultHash = crypto.createHash('sha256').update('nexus2026').digest('hex');

  for (const emp of employeesList) {
    const acc = checkAccount.get(emp.id);
    if (!acc) {
      const role = emp.department_id === 'dept-hcm' ? 'HR Administrator' : 'Employee';
      insertAccount.run(`acc_${emp.id}`, emp.id, emp.official_email, defaultHash, role, now);
    }
  }

  // =========================================================================
  // Seed Appraisal Cycles & Demo Scorecard if empty
  // =========================================================================
  const cycleCount = db.prepare('SELECT COUNT(*) as count FROM appraisal_cycles').get() as { count: number };
  if (cycleCount.count === 0) {
    const cycleId = 'cycle-2026-annual';
    db.prepare(`
      INSERT INTO appraisal_cycles (id, title, period_start, period_end, status, created_at)
      VALUES (?, ?, ?, ?, 'Active', ?)
    `).run(cycleId, '2026 Comprehensive Fiscal & Portfolio Appraisal', '2026-01-01', '2026-12-31', now);

    // Create a demo appraisal for the first employee
    const firstEmp = employeesList[0];
    if (firstEmp) {
      const appraisalId = `appr_${firstEmp.id}_2026`;
      db.prepare(`
        INSERT OR IGNORE INTO employee_appraisals (
          id, cycle_id, employee_id, reviewer_id, self_rating, self_comments,
          manager_rating, manager_comments, hr_final_score, hr_recommendation,
          status, submitted_at, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        appraisalId,
        cycleId,
        firstEmp.id,
        null,
        4.5,
        'Spearheaded workforce recruitment, automated 100% of outbox compliance alerts, and completed Tier-1 governance framework.',
        4.8,
        'Exceptional stewardship of human capital operations and zero audit infractions.',
        4.7,
        'Retain & Bonus',
        'Finalized',
        now,
        now,
        now,
        now
      );

      const KPIS = [
        { name: 'Workforce Retention & Key Cadre Attrition < 5%', weight: 30, target: 'Maintain stable Tier-1 lending credit and tech staffing.', self: 4.5, mgr: 5.0 },
        { name: 'Regulatory Audit & NDPA Compliance Perfection', weight: 30, target: 'Zero audit queries from CBN or cooperative agencies.', self: 5.0, mgr: 5.0 },
        { name: 'Staff Turnaround & Appraisal Cycle Completion', weight: 20, target: '100% of departmental evaluations processed on schedule.', self: 4.0, mgr: 4.5 },
        { name: 'Institutional Training & Credit Capacity Building', weight: 20, target: 'Execute 4 quarterly underwriting workshops for field officers.', self: 4.5, mgr: 4.5 }
      ];

      const insertKpi = db.prepare(`
        INSERT INTO appraisal_kpis (id, appraisal_id, kpi_name, weightage_percent, target_metric, self_score, manager_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < KPIS.length; i++) {
        const k = KPIS[i];
        insertKpi.run(`kpi_${appraisalId}_${i + 1}`, appraisalId, k.name, k.weight, k.target, k.self, k.mgr, now);
      }
    }
  }
}

// Auto-run migrations on load
initDatabase();

# Backend Architecture & HRMS API Survey Report

## 1. Observation

Direct code and database observations from workspace inspection:

### 1.1 Server Architecture & Runtime Setup
- **Vite Integration (`vite.config.ts:5-14`)**:
  ```ts
  import apiApp from './server/index.ts';

  function recruitmentApiPlugin(): Plugin {
    return {
      name: 'nexus-recruitment-api',
      configureServer(server) {
        server.middlewares.use(apiApp);
      },
    };
  }
  ```
  In development mode (`npm run dev` running Vite on port 3000), Vite's internal Connect dev server directly mounts Express `apiApp` via `server.middlewares.use(apiApp)`. No separate backend port or reverse proxy is used in dev.
- **Production Server (`server/server.ts:5-22`)**:
  ```ts
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const DIST_DIR = path.resolve(process.cwd(), 'dist');

  app.use(apiApp);
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  app.listen(PORT, '0.0.0.0', ...);
  ```
- **Express Middleware (`server/index.ts:10-24`)**:
  - `express.json()` and `express.urlencoded({ extended: true })` are registered.
  - No `cookie-parser` or CORS middleware is installed or loaded.
  - Mount paths:
    - `/api/recruitment` -> `recruitmentRouter` (`server/api.ts`)
    - `/api/hrms` -> `hrmsRouter` (`server/hrms/router.ts`)
  - Database initialized synchronously on startup (`initDatabase()`).
  - Outbox queue background worker runs every 30 seconds (`setInterval(processOutboxQueue, 30000)`).

### 1.2 SQLite Database Setup & Schema (`server/db.ts`)
- **Engine**: Node.js 24 native built-in `node:sqlite` (`DatabaseSync`).
- **File location**: `data/nexus_recruitment.db` (resolved via `process.env.DATA_DIR || path.resolve(process.cwd(), 'data')`).
- **Pragmas**:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  ```
- **23 Schema Tables Verified in SQLite**:
  1. `vacancies` (4 records seeded)
  2. `candidates` (4 records)
  3. `applications` (2 records)
  4. `application_documents` (1 record)
  5. `application_notes` (0 records)
  6. `application_status_history` (3 records)
  7. `email_outbox` (4 records)
  8. `recruitment_settings` (11 key-values seeded)
  9. `audit_events` (19 records)
  10. `departments` (6 seeded departments: HCM, CRK, OPS, TRS, TECH, LGL)
  11. `designations` (16 job cadres across departments with cadre_level, grade_code, and daily_expense_cap)
  12. `employees` (3 records seeded)
  13. `employee_documents` (0 records)
  14. `leave_types` (6 leave types: Annual, Sick, Casual, Maternity, Paternity, Study)
  15. `employee_leave_balances` (18 records for year 2026)
  16. `leave_requests` (1 record)
  17. `expense_claims` (2 records)
  18. `expense_items` (4 records)
  19. `expense_receipts` (0 records)
  20. `employee_accounts` (3 records seeded)
  21. `appraisal_cycles` (1 record: `cycle-2026-annual`)
  22. `employee_appraisals` (1 record)
  23. `appraisal_kpis` (4 records)

- **Existing Seeded Employees (`data/nexus_recruitment.db`)**:
  - `emp_amina_bello` (Employee Number: `NX-0001`, Dr. Amina Bello, `amina.bello@nexusfinance.com`, Department: `dept-hcm`, Designation: `desig-hcm-head`, Status: `Active`, Date of Joining: `2024-01-15`, Monthly Salary: NGN 1,450,000)
  - `emp_82cb3e3b-9ca4-4844-84ff-0c45a3f29b21` (Employee Number: `NX-0002`, Oluwaseun Adeyemi, `oluwaseun.adeyemi@nexusfinance.com`, Department: `dept-credit`, Designation: `desig-crk-snr`, Status: `Active`, Date of Joining: `2026-11-03`)
  - `emp_d1900330-4258-460d-aa81-c6624abd6c5c` (Employee Number: `NX-0003`, Oluwaseun Adeyemi, `oluwaseun.adeyemi2@nexusfinance.com`, Department: `dept-credit`, Designation: `desig-crk-snr`, Status: `Active`, Date of Joining: `2026-11-03`)

- **Existing Seeded Accounts (`employee_accounts`)**:
  - `acc_emp_amina_bello`: Username `amina.bello@nexusfinance.com`, Role: `HR Administrator`, Active: 1, Last Login: `2026-11-05T12:33:32.196Z`, Password Hash: SHA-256 of `nexus2026`.
  - `acc_emp_82cb...`: Username `oluwaseun.adeyemi@nexusfinance.com`, Role: `Employee`, Active: 1, Last Login: `null`, Password Hash: SHA-256 of `nexus2026`.
  - `acc_emp_d190...`: Username `oluwaseun.adeyemi2@nexusfinance.com`, Role: `Employee`, Active: 1, Last Login: `null`, Password Hash: SHA-256 of `nexus2026`.

### 1.3 Current HRMS API Endpoints & Auth Middleware
From `server/hrms/router.ts`:
- **Public**:
  - `POST /api/hrms/auth/login` (`staffLogin` in `server/hrms/auth.ts`)
- **Protected Endpoints** (currently wrapped by `requireRecruitmentAuth`):
  - `GET /api/hrms/employees` (`listEmployees`)
  - `GET /api/hrms/employees/:id` (`getEmployeeDetails`)
  - `POST /api/hrms/employees/convert-applicant` (`convertApplicantToEmployee`)
  - `PATCH /api/hrms/employees/:id` (`updateEmployee`)
  - `GET /api/hrms/employees/:id/account` (`getEmployeeAccount`)
  - `POST /api/hrms/employees/:id/account` (`provisionEmployeeAccount`)
  - `GET /api/hrms/departments` (`listDepartments`)
  - `POST /api/hrms/departments` (`createDepartment`)
  - `PATCH /api/hrms/departments/:id` (`updateDepartment`)
  - `DELETE /api/hrms/departments/:id` (`deleteDepartment`)
  - `POST /api/hrms/designations` (`createDesignation`)
  - `PATCH /api/hrms/designations/:id` (`updateDesignation`)
  - `DELETE /api/hrms/designations/:id` (`deleteDesignation`)
  - `GET /api/hrms/documents/:id/download` (`downloadEmployeeDocument`)
  - `POST /api/hrms/employees/:employeeId/documents` (`uploadEmployeeDocument`)
  - `PATCH /api/hrms/documents/:id/verify` (`verifyEmployeeDocument`)
  - `GET /api/hrms/leaves/types` (`listLeaveTypes`)
  - `GET /api/hrms/leaves/requests` (`listLeaveRequests`)
  - `POST /api/hrms/leaves/requests` (`submitLeaveRequest`)
  - `PATCH /api/hrms/leaves/requests/:id/action` (`actionLeaveRequest`)
  - `GET /api/hrms/expenses/claims` (`listExpenseClaims`)
  - `GET /api/hrms/expenses/claims/:id` (`getExpenseClaimDetails`)
  - `POST /api/hrms/expenses/claims` (`createExpenseClaim`)
  - `POST /api/hrms/expenses/items/:itemId/receipt` (`uploadExpenseReceipt`)
  - `PATCH /api/hrms/expenses/claims/:id/action` (`actionExpenseClaim`)
  - `GET /api/hrms/appraisals/cycles` (`listAppraisalCycles`)
  - `POST /api/hrms/appraisals/cycles` (`createAppraisalCycle`)
  - `PATCH /api/hrms/appraisals/cycles/:id` (`updateAppraisalCycle`)
  - `GET /api/hrms/appraisals` (`listAppraisals`)
  - `GET /api/hrms/appraisals/:id` (`getAppraisalDetails`)
  - `POST /api/hrms/appraisals` (`initializeAppraisal`)
  - `PATCH /api/hrms/appraisals/:id/self-evaluate` (`selfEvaluateAppraisal`)
  - `PATCH /api/hrms/appraisals/:id/manager-review` (`managerReviewAppraisal`)
  - `PATCH /api/hrms/appraisals/:id/finalize` (`finalizeAppraisal`)

- **Auth Middleware Flaw Observed**:
  In `server/auth.ts:67-76`, `requireRecruitmentAuth` falls back to `role: 'Recruitment Administrator'` and `name: 'Executive Admin'` if no `x-nexus-role` or `authorization` header is present. Consequently, unauthenticated calls default to full admin privileges unless explicitly validated.

---

## 2. Logic Chain

1. **Requirement R2 (Workforce Statistics)** requires: "Workforce Statistics Panel: Analytical counters pulling live numbers from SQLite (Total Active Headcount, Newly Onboarded This Month, and a Departmental Breakdown Chart)".
   - Observation: No endpoint exists in `server/hrms/` that computes aggregate statistics.
   - Inference: We must provide `GET /api/hrms/stats` (or `GET /api/hrms/dashboard/stats`) querying `employees` and `departments`.

2. **Requirement R2 (Recent Activity Stream)** requires: "Recent Activity Stream: A live operational feed showing the latest system operations".
   - Observation: SQLite has table `audit_events` with 19 events, but only `GET /api/recruitment/audit` exists (restricted to `Recruitment Administrator` on the recruitment router). HRMS has no endpoint exposing activity logs.
   - Inference: We must add `GET /api/hrms/activity` in `server/hrms/router.ts` that returns recent audit events (ordered by `created_at DESC`).

3. **Requirement R2 & R4 (Onboarding Module)** requires: "Trigger an onboarding form (React 19) to input full name, email, salary parameters, department, and role assignments, inserting records into SQLite via the backend."
   - Observation: `HrmsPortal.tsx:1208` tried to call `POST /api/hrms/employees/convert-applicant` with a fake `application_id: 'manual_' + Date.now()`, which fails with HTTP 404 because `convertApplicantToEmployee` strictly requires a real row in `applications`.
   - Observation: There is no `POST /api/hrms/employees` endpoint in `server/hrms/router.ts`.
   - Inference: We must add `POST /api/hrms/employees` (`createEmployee`) that generates an employee number (`generateEmployeeNumber()`), inserts into `employees`, sets up initial leave balances (`initializeEmployeeLeaveBalances()`), creates `employee_accounts` with role assignment ('Employee' or 'HR Administrator'), and writes an audit event.

4. **Requirement R1 & R2 (Public Corporate Directory vs. Admin Filter)** requires:
   - R1: "Searching the public corporate directory (by coworker, department, or manager email)... Access Restrictions: Regular employees are strictly barred from administrative settings, editing core contract profiles, or viewing other employees' private data."
   - R2: "Global Search & Filter: Filter and search employees using administrative criteria (such as filtering by inactive status or hiring dates)."
   - Observation: `GET /api/hrms/employees` executes `SELECT e.*` which exposes `salary_monthly`, `bank_account_number`, `bvn_nin_masked`, and `personal_email`. Furthermore, it only searches `first_name`, `last_name`, `official_email`, `employee_number`, with no search on manager email, and has no date range filtering for hire dates.
   - Inference: We need two distinct endpoints or sanitization modes:
     1. `GET /api/hrms/directory`: Public corporate directory accessible to regular employees that strictly projects public fields (name, department, designation, official email, phone, location, manager name/email) and searches across coworker name, department, or manager email.
     2. Enhanced `GET /api/hrms/employees`: HR admin view that supports filtering by `status` (including `'Inactive'`), `hire_date_from`, `hire_date_to`, and department.

5. **Requirement R1 (Security Notification Tracker & Session Logout)** requires:
   - "Security Notification Tracker: A security log showing last successful login timestamp and active session info."
   - "Securely logging out to terminate active JWT cookie session."
   - Observation: `employee_accounts` records `last_login`, and `audit_events` records `staff_portal_login`. But no endpoint exists to retrieve an employee's login history, and no logout endpoint exists to clear session cookies.
   - Inference: We must add `GET /api/hrms/auth/security-log` (or `GET /api/hrms/me/security-log`) returning `last_login` and recent login audit events for the employee, and `POST /api/hrms/auth/logout` to clear cookie sessions.

6. **Requirement R2 (Edit & Terminate Profiles)** requires: "Access user files in the directory to update department, change employment status between active and inactive (offboarding), or change manager."
   - Observation: `PATCH /api/hrms/employees/:id` updates `department_id`, `reporting_manager_id`, and `employment_status`, but it does NOT update `employee_accounts.is_active` when an employee is set to `'Terminated'` or `'Resigned'`.
   - Inference: `PATCH /api/hrms/employees/:id` must synchronize `employee_accounts.is_active = (new_status === 'Active' ? 1 : 0)` and log an explicit `employee_status_change` audit event.

---

## 3. Caveats

1. **Authentication Mode**: The existing system accepts `x-nexus-role`, `x-nexus-user`, and `x-nexus-staff-id` headers, as well as bearer tokens. To satisfy the R1 requirement for terminating a "JWT cookie session" without breaking existing header-based CMS / HRMS functionality, cookie support (`nexus_session` / `nexus_jwt`) should be added in a backward-compatible manner (checking cookies first, falling back to headers/Bearer tokens).
2. **Node Native SQLite Features**: Node 24's built-in `DatabaseSync` is synchronous. All queries (`.all()`, `.get()`, `.run()`) execute synchronously on the main thread, which is normal and performant for SQLite in WAL mode with the current schema.
3. **No Direct Code Modifications Performed**: As an explorer in discovery mode, no application code was edited during this survey.

---

## 4. Conclusion

The existing backend is well-structured around Node 24 native SQLite with 23 tables, active seed data, and a running Express API mounted via Vite Connect in dev and standalone in production. However, to complete R1, R2, and R4, six specific backend gaps must be addressed:

1. **New Route**: `GET /api/hrms/stats` for live workforce analytics (Active Headcount, New This Month, Department Breakdown).
2. **New Route**: `GET /api/hrms/activity` for the live operational audit stream.
3. **New Route**: `POST /api/hrms/employees` for direct React 19 form onboarding (creating employee record, initial leave balances, and login credentials in `employee_accounts`).
4. **New Route**: `GET /api/hrms/directory` for public employee search (sanitized fields, coworker/department/manager email query) preventing data leakage to regular staff.
5. **New Routes**: `GET /api/hrms/me/security-log` & `POST /api/hrms/auth/logout` for security tracker and cookie-based session termination.
6. **Enhanced Route**: `PATCH /api/hrms/employees/:id` to synchronize `is_active` in `employee_accounts` upon offboarding/termination.

---

## 5. Proposed Function Signatures & Route Specifications

### 5.1 Route: `GET /api/hrms/stats` (Workforce Statistics Panel)
- **File**: `server/hrms/employees.ts` (or `server/hrms/stats.ts`)
- **Access**: HR Administrator (`requireHrmsAuth(['HR Administrator', 'Recruitment Administrator'])`)
- **Handler Signature**:
  ```ts
  export function getWorkforceStats(req: Request, res: Response): void;
  ```
- **SQL Queries**:
  ```sql
  -- Total active headcount
  SELECT COUNT(*) as active_headcount FROM employees WHERE employment_status = 'Active';

  -- Newly onboarded this month
  SELECT COUNT(*) as new_this_month 
  FROM employees 
  WHERE substr(date_of_joining, 1, 7) = strftime('%Y-%m', 'now');

  -- Department breakdown chart data
  SELECT 
    d.id as department_id,
    d.name as department_name,
    d.code as department_code,
    COUNT(e.id) as total_headcount,
    SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) as active_headcount,
    SUM(CASE WHEN e.employment_status != 'Active' THEN 1 ELSE 0 END) as inactive_headcount
  FROM departments d
  LEFT JOIN employees e ON d.id = e.department_id
  GROUP BY d.id, d.name, d.code
  ORDER BY active_headcount DESC;
  ```
- **Response Shape**:
  ```json
  {
    "success": true,
    "stats": {
      "activeHeadcount": 3,
      "totalHeadcount": 3,
      "newlyOnboardedThisMonth": 2,
      "currentMonth": "2026-11",
      "departmentsCount": 6,
      "departmentBreakdown": [
        {
          "departmentId": "dept-credit",
          "departmentName": "Credit Risk & Underwriting",
          "departmentCode": "CRK",
          "totalHeadcount": 2,
          "activeHeadcount": 2,
          "inactiveHeadcount": 0
        },
        {
          "departmentId": "dept-hcm",
          "departmentName": "Human Capital Management",
          "departmentCode": "HCM",
          "totalHeadcount": 1,
          "activeHeadcount": 1,
          "inactiveHeadcount": 0
        }
      ]
    }
  }
  ```

### 5.2 Route: `GET /api/hrms/activity` (Recent Activity Stream)
- **File**: `server/hrms/employees.ts`
- **Access**: HR Administrator
- **Handler Signature**:
  ```ts
  export function getRecentActivityStream(req: Request, res: Response): void;
  ```
- **Query Params**: `limit` (default: 25, max: 100), `entity_type` (optional filter)
- **SQL Query**:
  ```sql
  SELECT id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at
  FROM audit_events
  ORDER BY created_at DESC
  LIMIT ?;
  ```
- **Response Shape**:
  ```json
  {
    "success": true,
    "activities": [
      {
        "id": "uuid",
        "userName": "Dr. Amina Bello",
        "userRole": "HR Administrator",
        "action": "staff_portal_login",
        "entityType": "employee_account",
        "entityId": "acc_emp_amina_bello",
        "details": { "employee_number": "NX-0001" },
        "createdAt": "2026-11-05T12:33:32.204Z"
      }
    ]
  }
  ```

### 5.3 Route: `POST /api/hrms/employees` (Direct Onboarding Module)
- **File**: `server/hrms/employees.ts`
- **Access**: HR Administrator
- **Handler Signature**:
  ```ts
  export function createEmployee(req: Request, res: Response): void;
  ```
- **Request Body**:
  ```json
  {
    "first_name": "Ibrahim",
    "last_name": "Garba",
    "official_email": "ibrahim.garba@nexusfinance.com",
    "personal_email": "i.garba@gmail.com",
    "phone": "+234 803 123 4567",
    "department_id": "dept-ops",
    "designation_id": "desig-ops-cust",
    "salary_monthly": 350000,
    "reporting_manager_id": "emp_amina_bello",
    "branch_location": "Abuja Head Office (CBD)",
    "employment_type": "Full-Time",
    "employment_status": "Active",
    "date_of_joining": "2026-11-05",
    "role": "Employee",
    "password": "optionalPasswordOrNexus2026",
    "bank_name": "First Bank Plc",
    "bank_account_number": "3012345678",
    "bvn_nin_masked": "221***902"
  }
  ```
- **Processing Logic**:
  1. Generate `employee_number` using `generateEmployeeNumber()`.
  2. If `official_email` omitted, generate unique `first.last@nexusfinance.com`.
  3. Insert into `employees`.
  4. Call `initializeEmployeeLeaveBalances(employeeId)`.
  5. Insert account into `employee_accounts` with specified `role` and hashed password (`default: nexus2026`).
  6. Call `logAuditEvent` with `action: 'onboard_new_employee'`.
  7. Return `201 Created` with employee metadata.

### 5.4 Route: `GET /api/hrms/directory` (Public Corporate Directory)
- **File**: `server/hrms/employees.ts`
- **Access**: All Authenticated Roles (`Employee`, `HR Administrator`, `Line Manager`, etc.)
- **Handler Signature**:
  ```ts
  export function getPublicDirectory(req: Request, res: Response): void;
  ```
- **Query Params**: `search` (coworker name, department name, or manager email), `department_id`, `page`, `limit`
- **SQL Projection** (strictly excludes financial & sensitive PII):
  ```sql
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
    des.title as designation_title,
    des.cadre_level,
    (m.first_name || ' ' || m.last_name) as reporting_manager_name,
    m.official_email as reporting_manager_email
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN designations des ON e.designation_id = des.id
  LEFT JOIN employees m ON e.reporting_manager_id = m.id
  WHERE e.employment_status = 'Active'
    AND (
      ? IS NULL OR
      e.first_name LIKE ? OR
      e.last_name LIKE ? OR
      (e.first_name || ' ' || e.last_name) LIKE ? OR
      e.official_email LIKE ? OR
      d.name LIKE ? OR
      m.official_email LIKE ? OR
      (m.first_name || ' ' || m.last_name) LIKE ?
    )
  ORDER BY e.first_name ASC, e.last_name ASC;
  ```

### 5.5 Route: `GET /api/hrms/auth/security-log` (Security Notification Tracker)
- **File**: `server/hrms/auth.ts`
- **Access**: All Authenticated Staff (queries for the calling employee)
- **Handler Signature**:
  ```ts
  export function getEmployeeSecurityLog(req: Request, res: Response): void;
  ```
- **Processing Logic**:
  - Resolve employee ID from session / header (`req.headers['x-nexus-staff-id']` or active account).
  - Query `employee_accounts` for `last_login`, `role`, `is_active`.
  - Query `audit_events` for recent events matching `entity_id = account.id` or `user_name = employee.name` where `action LIKE 'staff_portal_%'`.
  - Return `lastLogin`, `activeSession: true`, `ipAddress: req.ip`, and `recentLogins` array.

### 5.6 Route: `POST /api/hrms/auth/logout` (Secure Session Termination)
- **File**: `server/hrms/auth.ts`
- **Handler Signature**:
  ```ts
  export function staffLogout(req: Request, res: Response): void;
  ```
- **Processing Logic**:
  - Log audit event `staff_portal_logout`.
  - Set expired cookie: `Set-Cookie: nexus_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`.
  - Return `{ success: true, message: "Session successfully terminated." }`.

### 5.7 Enhanced Route: `PATCH /api/hrms/employees/:id` (Status & Offboarding Sync)
- **File**: `server/hrms/employees.ts`
- **Enhancement Logic**:
  ```ts
  if (employment_status !== undefined) {
    const isNowActive = (employment_status === 'Active' || employment_status === 'Probation') ? 1 : 0;
    db.prepare('UPDATE employee_accounts SET is_active = ? WHERE employee_id = ?').run(isNowActive, id);
    
    logAuditEvent({
      userName: req.headers['x-nexus-user'] || 'HR Admin',
      userRole: req.headers['x-nexus-role'] || 'HR Administrator',
      action: isNowActive ? 'employee_status_reactivated' : 'employee_offboarding_status_changed',
      entityType: 'employee',
      entityId: id,
      details: { new_status: employment_status, is_active: isNowActive }
    });
  }
  ```

---

## 6. Verification Method

To verify all survey findings and validate proposed implementations:
1. **Database Schema & Table Content Verification**:
   ```powershell
   node --input-type=module -e "import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync('data/nexus_recruitment.db'); console.log('Tables:', db.prepare('SELECT COUNT(*) as c FROM sqlite_master WHERE type=\'table\'').get().c); console.log('Employees:', db.prepare('SELECT id, employee_number, first_name, official_email FROM employees').all());"
   ```
2. **Current API Server Endpoints Inspection**:
   - Inspect `server/hrms/router.ts` lines 50-135 to verify missing routes (`/stats`, `/activity`, `POST /employees`, `/directory`).
3. **Application Build Test**:
   ```powershell
   npm run build
   ```
   Ensures zero TypeScript and build errors across frontend and backend.
4. **Invalidation Condition**:
   - If SQLite schema is replaced with a remote DB or if Express router structure is restructured away from `server/hrms/router.ts`, these paths and SQL queries would need adjustment.

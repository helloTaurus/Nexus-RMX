# Architectural Survey & Handoff Report: Phase 1 Role-Adaptive Dashboards

**Task**: Survey codebase architecture, auth system, App.tsx routing, Tailwind CSS setup, icon libraries, theme switching, and dashboard structure for Remix Nexus Finance Phase 1 Role-Adaptive UX implementation.  
**Date**: 2026-11-05T13:16:00Z  
**Author**: explorer_survey_1  
**Target Handoff**: Orchestrator (`da8302f1-8920-414c-9f43-a2e804998af4`) & Implementation Agents  

---

## 1. Observation

### 1.1 Authentication & Session Management
- **No Global Auth Context**: A search across `src/` for `createContext` or `useAuth` yielded 0 matches.
- **Frontend Persona State**: In `src/components/HrmsExecutivePortal.tsx:75-85`, active staff state is maintained locally in component state:
  ```tsx
  const [activeStaff, setActiveStaff] = useState<any>({
    id: 'emp_amina_bello',
    employee_number: 'NX-0001',
    first_name: 'Dr. Amina',
    last_name: 'Bello',
    official_email: 'amina.bello@nexusfinance.com',
    role: 'HR Administrator',
    department_name: 'Human Capital & Governance',
    designation_title: 'Head of Human Capital Management',
    daily_expense_cap: 85000
  });
  ```
- **Login Modal & Endpoint**: `src/components/HrmsExecutivePortal.tsx:205-241` defines `handleStaffLogin`, which sends a `POST` request to `/api/hrms/auth/login` with `{ username, password }`. On success, it sets `activeStaff`, sets `viewMode = 'employee_self_service'`, and sets `window.location.hash = '#staffportal'`.
- **Backend Login Verification**: In `server/hrms/auth.ts:18-108`:
  - `staffLogin(req, res)` matches `username` against `employee_accounts.username`, `employees.official_email`, or `employees.employee_number`.
  - Compares SHA-256 password hash against `employee_accounts.password_hash`.
  - Updates `last_login` timestamp in `employee_accounts` (line 69).
  - Generates session token: `nexus_sess_${account.employee_id}_${crypto.randomBytes(16).toString('hex')}` (line 72).
  - Logs audit event to `audit_events` via `logAuditEvent` (line 74).
  - Returns JSON containing `token` and `staff` metadata (lines 84-103).
- **Available Roles in SQLite**:
  - `server/db.ts:381`: Column `role TEXT NOT NULL DEFAULT 'Employee'` in table `employee_accounts` (`'Employee'`, `'Line Manager'`, `'HR Reviewer'`, `'HR Administrator'`).
  - Seeded accounts in DB:
    1. `NX-0001`: Dr. Amina Bello (`amina.bello@nexusfinance.com`), Role: `HR Administrator` (default password: `nexus2026`).
    2. `NX-0002`: Oluwaseun Adeyemi (`oluwaseun.adeyemi@nexusfinance.com`), Role: `Employee` (default password: `nexus2026`).
    3. `NX-0003`: Oluwaseun Adeyemi (`oluwaseun.adeyemi2@nexusfinance.com`), Role: `Employee` (default password: `nexus2026`).

### 1.2 Routing & Navigation Structure
- **View Enum**: In `src/App.tsx:31-40`:
  ```tsx
  type ActiveView =
    | 'home'
    | 'about'
    | 'blog'
    | 'careers'
    | 'gallery'
    | 'product-detail'
    | 'cms'
    | 'hrms'
    | 'staffportal';
  ```
- **Hash Listener**: In `src/App.tsx:77-91`:
  ```tsx
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#staffportal') {
        setCurrentView('staffportal');
      } else if (hash === '#hrms') {
        setCurrentView('hrms');
      } else if (hash === '#cms') {
        setCurrentView('cms');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);
  ```
- **Mount Point**: In `src/App.tsx:242-247`:
  ```tsx
  {(currentView === 'hrms' || currentView === 'staffportal') && (
    <HrmsExecutivePortal
      initialViewMode={currentView === 'staffportal' ? 'employee_self_service' : 'hr_admin'}
      onNavigate={handleNavigate}
    />
  )}
  ```
- **Footer Navigation**: `src/components/Footer.tsx:334` & `342` contain buttons triggering `handleNav('staffportal')` and `handleNav('hrms')`.

### 1.3 UI Frameworks, Icons, Styling & Animations
- **Tailwind Setup**: Tailwind CSS v4 is configured via `@tailwindcss/vite` (`^4.3.3`) in `vite.config.ts:1` and imported via `@import "tailwindcss";` in `src/index.css:1`.
  - Brand green accent: `#00e575` (`.bg-tuyo-green`, `.text-tuyo-green`, `.glow-tuyo`).
  - Dark surfaces: `#000000`, `#07090e`, `bg-neutral-900/80`, `.glass-panel` (backdrop blur + border `rgba(255,255,255,0.08)`).
  - Fonts: `font-display` (Bricolage Grotesque), `font-body` (Instrument Sans), `font-mono-nums`.
- **Theme Switching**: `src/hooks/useTheme.ts:19-71` provides `useTheme()` with `{ theme, toggleTheme }`. It writes to `localStorage.getItem('nexus-theme')`, applies `'dark'` / `'light'` classes on `document.documentElement`, and dispatches `nexus-theme-change` events.
- **Animation Library**:
  - `package.json:21` has `"motion": "^12.23.24"`.
  - Existing components (e.g. `CookieConsent.tsx:2`, `Hero.tsx:2`, `LoadingScreen.tsx:2`, `ProductBento.tsx:2`) import Motion as:
    ```tsx
    import { motion, AnimatePresence } from 'motion/react';
    ```
    *(Note: NOT `from 'framer-motion'`, but `from 'motion/react'`)*.
- **Icon Libraries**:
  - `lucide-react` (`^0.546.0`) is installed and used in `CardShowcase.tsx`, `GlobalNetwork.tsx`, `TestimonialsSection.tsx`.
  - `@phosphor-icons/react` (`^2.1.10`) is installed and used across `HrmsExecutivePortal.tsx`, `Navbar.tsx`, `Footer.tsx`.

### 1.4 Backend Endpoints & Database
- **Express Server**: `vite.config.ts:7-14` mounts `apiApp` (`server/index.ts`) directly as Vite middleware. All API endpoints under `/api/hrms/*` and `/api/recruitment/*` run seamlessly inside `npm run dev` and in `server/server.ts`.
- **Database**: `server/db.ts` uses Node.js 22 built-in SQLite (`DatabaseSync` from `node:sqlite`) with persistent file `data/nexus_recruitment.db`.
- **Existing HRMS Routes** (`server/hrms/router.ts`):
  - `GET /api/hrms/employees` (supports search, department_id, status filters)
  - `GET /api/hrms/employees/:id` (returns employee dossier, documents, and leave balances)
  - `PATCH /api/hrms/employees/:id` (updates department, status, manager, personal info)
  - `POST /api/hrms/employees/convert-applicant` (converts recruitment applicant to employee)
  - `GET /api/hrms/departments` (lists departments with designations and active counts)
- **Missing Backend Endpoints**:
  1. Direct Employee Onboarding: No `POST /api/hrms/employees` endpoint currently exists to onboard an employee directly from a form without an existing application ID.
  2. Workforce Statistics: No `GET /api/hrms/stats` endpoint currently exists to return live headcount, new onboardings this month, and departmental breakdown.
  3. Live Audit Activity Stream: While `audit_events` exists and has live records, there is no dedicated `/api/hrms/activity` route (only `/api/recruitment/audit`).

### 1.5 Build & Lint Status
- `npm run build` executed successfully: Built client in 9.00s with 0 errors.
- `npm run lint` (`tsc --noEmit`) executed successfully with exit code 0.

---

## 2. Logic Chain

1. **Auth Context Requirement**: Because there is currently no global `AuthContext` (Observation 1.1), `user.role` cannot be accessed cleanly across components, and user identity is hardcoded into `HrmsExecutivePortal`. Creating `src/context/AuthContext.tsx` with JWT/token and role mapping (`hr_admin` vs `employee`) will fulfill R1, R2, and R3.
2. **Role Mapping**: The database stores roles as strings such as `'HR Administrator'` and `'Employee'`. To satisfy the requirement `user.role === 'hr_admin' ? <AdminView /> : <EmployeeView />`, `AuthContext` should normalize the backend role:
   - `'HR Administrator'` / `'Recruitment Administrator'` $\rightarrow$ `'hr_admin'`
   - `'Employee'` / `'Line Manager'` $\rightarrow$ `'employee'`
3. **Routing Transition**: In `App.tsx`, both `#hrms` and `#staffportal` routes are already caught by `handleHash` (Observation 1.2). By replacing the direct instantiation of `HrmsExecutivePortal` at lines 242-247 with a unified `RoleAdaptiveDashboard`, both routes will route to the authenticated dashboard tailored to the user's role. If unauthenticated, it presents the login view with demo persona credentials.
4. **Motion v12 Compatibility**: Since Motion v12 is installed as package `motion` (Observation 1.3), all animation imports in new components (`RoleAdaptiveDashboard`, `EmployeeView`, `AdminView`) must use `import { motion, AnimatePresence } from 'motion/react';` to avoid module resolution errors.
5. **Backend Extensions**:
   - For Requirement R2 ("Onboarding Module: Trigger an onboarding form to input full name, email, salary parameters, department, and role assignments, inserting records into SQLite via the backend"): A new handler `createEmployee` mounted at `POST /api/hrms/employees` is required.
   - For Requirement R2 ("Workforce Statistics Panel: Analytical counters pulling live numbers from SQLite"): A new handler mounted at `GET /api/hrms/stats` is required to aggregate `employees` and `departments`.
   - For Requirement R2 ("Recent Activity Stream: A live operational feed showing the latest system operations"): A new handler mounted at `GET /api/hrms/activity` is required to query `audit_events`.
6. **Strict Access Separation**: To satisfy R1 ("Regular employees are strictly barred from administrative settings, editing core contract profiles, or viewing other employees' private data"):
   - When `user.role !== 'hr_admin'`, the public directory returned to `EmployeeView` must exclude sensitive fields (`salary_monthly`, `bvn_nin_masked`, `bank_account_number`).
   - Profile editing and termination actions must only render in `AdminView`.

---

## 3. Caveats

1. **No External JWT Library**: Currently, session tokens are secure random hex strings (`nexus_sess_...`) saved in `employee_accounts` and verified via headers/session tokens rather than signed RS256/HS256 JWTs. The prompt mentions "terminating active JWT cookie session". We can store this session token in both `localStorage` and `document.cookie` (`nexus_session_token`), and clear it on logout.
2. **Preserving Full HRMS Functionality**: The existing `HrmsExecutivePortal.tsx` is an extensive 2,300-line operational suite (Leaves, Claims, Appraisals, Recruitment). The new `AdminView` can either embed or provide seamless navigation into these existing modules so existing recruitment, leave, and expense functionality is preserved without regressions.
3. **TypeScript Strictness**: `tsconfig.json` runs with strict checks. All new interfaces (`EmployeeUser`, `DashboardStats`, `ActivityLogItem`) must be strictly typed to keep `tsc --noEmit` passing.

---

## 4. Conclusion

The architecture is well-prepared for Phase 1 implementation. To deliver the requirements with zero regressions, the following structure should be implemented:

### Component & File Plan

| File Path | Action | Description / Responsibility |
|-----------|--------|------------------------------|
| `src/context/AuthContext.tsx` | **Create** | Provides `{ user, token, login, logout, isAuthenticated, isLoading }`. Handles role normalization (`hr_admin` vs `employee`), session storage in cookie/localStorage, and login timestamp. |
| `src/components/dashboard/RoleAdaptiveDashboard.tsx` | **Create** | Unified dashboard wrapper mounted in `App.tsx` for `#hrms` and `#staffportal`. Features login state with quick persona selectors, Framer Motion transitions (`AnimatePresence`), and conditionally renders `<AdminView />` or `<EmployeeView />`. |
| `src/components/dashboard/EmployeeView.tsx` | **Create** | Personalized read-only self-service hub: Welcome header, Profile card, Quick Links with Lucide/Phosphor icons, Security Notification tracker (last login + IP/session info), public coworker directory search, theme toggle, and secure logout. Strictly excludes confidential peer data and admin tools. |
| `src/components/dashboard/AdminView.tsx` | **Create** | HR Command Center: Live workforce statistics panel (active headcount, monthly onboarding, departmental breakdown), privileged admin controls, live activity stream from SQLite `audit_events`, direct onboarding form modal, employee profile update & offboarding/termination modal, and global search/filter. |
| `src/App.tsx` | **Modify** | Wrap application or dashboard with `AuthProvider`. Update lines 242-247 to mount `RoleAdaptiveDashboard` on `#hrms` and `#staffportal`. |
| `server/hrms/employees.ts` | **Extend** | Add `createEmployee` (`POST /api/hrms/employees`), `getWorkforceStats` (`GET /api/hrms/stats`), and `getRecentActivity` (`GET /api/hrms/activity`). |
| `server/hrms/router.ts` | **Extend** | Mount `POST /employees`, `GET /stats`, and `GET /activity`. |
| `tests/role-adaptive-dashboard.test.ts` | **Create** | Automated test script (executable with `npx tsx`) testing API endpoints, role-based view differentiation, employee access restrictions, and admin onboarding/status mutation. |

---

## 5. Verification Method

Downstream implementers and testing agents can verify the implementation using:

1. **Automated Integration & API Test**:
   ```powershell
   npx tsx tests/role-adaptive-dashboard.test.ts
   ```
   *Expected*: Passes all test assertions for staff login, statistics computation, direct onboarding insertion into SQLite, status updates, and role differentiation.

2. **TypeScript & Static Typechecking**:
   ```powershell
   npm run lint
   ```
   *Expected*: `tsc --noEmit` exits with status code 0.

3. **Vite Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Vite builds bundle into `dist/` with zero build errors.

4. **Visual & Interactive Verification Conditions**:
   - Navigate to `#hrms` or `#staffportal`: Displays the role-adaptive authentication/dashboard interface.
   - Log in as Dr. Amina Bello (`amina.bello@nexusfinance.com` / `nexus2026`): Renders `AdminView` with live headcount, departmental breakdown chart, onboarding form, and audit stream.
   - Log in as Oluwaseun Adeyemi (`oluwaseun.adeyemi@nexusfinance.com` / `nexus2026`): Renders `EmployeeView` with personalized identity header, HR metadata, quick links, directory search, and security log. Administrative controls and confidential salaries/BVNs must be absent.
   - Click Dark/Light toggle: Verifies root HTML class toggles and UI renders correctly in both themes.
   - Submit Onboarding form in `AdminView`: Verifies new employee is inserted into SQLite and reflected immediately in live headcount.
   - Click Logout: Active session is terminated, cookie/storage cleared, and view resets.

---
*End of Report.*

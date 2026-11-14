# Project: Remix Nexus Finance — Phase 1 Role-Adaptive Dashboards

## Architecture
- **Frontend**: React 19 (`react`, `react-dom`), Motion v12 (`motion/react`), Tailwind CSS v4 (`@tailwindcss/vite`), Phosphor Icons (`@phosphor-icons/react`), Lucide Icons (`lucide-react`).
- **Backend & API**: Express (`apiApp`) mounted directly into Vite Connect dev server on port 3000, and served via `server/server.ts` in production.
- **Database**: Node.js native `DatabaseSync` (`node:sqlite`) in WAL mode at `data/nexus_recruitment.db`.
- **State & Context**:
  - `src/context/AuthContext.tsx`: Manages authentication state, user metadata, normalized role (`hr_admin` vs `employee`), session tokens, and login/logout handlers.
  - `src/components/dashboard/RoleAdaptiveDashboard.tsx`: Unified root dashboard mounted at `#hrms` and `#staffportal` in `src/App.tsx`.
  - `src/components/dashboard/EmployeeView.tsx`: Personalized read-only self-service hub.
  - `src/components/dashboard/AdminView.tsx`: HR command center with workforce analytics, onboarding form modal, profile editor/offboarder, and global search/filter.

## Code Layout
```
remix-nexus-finance/
├── data/
│   └── nexus_recruitment.db               # SQLite database (employees, accounts, audit_events)
├── server/
│   ├── db.ts                              # SQLite database schema, pragmas, initialization
│   ├── index.ts                           # Express app mounting routers, background outbox worker
│   └── hrms/
│       ├── auth.ts                        # Auth handlers (login, logout, security-log)
│       ├── employees.ts                   # Employee CRUD, onboarding, stats, activity stream, directory
│       └── router.ts                      # Express HRMS routes definition
├── src/
│   ├── App.tsx                            # Root application, routing for #hrms and #staffportal
│   ├── context/
│   │   └── AuthContext.tsx                # Role-adaptive authentication context & provider
│   ├── hooks/
│   │   └── useTheme.ts                    # Dark / Light theme hook
│   └── components/
│       └── dashboard/
│           ├── RoleAdaptiveDashboard.tsx  # Dynamic dashboard routing & Framer Motion transitions
│           ├── EmployeeView.tsx           # Employee self-service hub (R1)
│           ├── AdminView.tsx              # HR Administrator command center (R2)
│           ├── OnboardingModal.tsx        # React 19 employee onboarding modal
│           ├── ProfileEditModal.tsx       # Department update, offboarding/status change modal
│           └── DirectorySearchModal.tsx   # Public sanitized coworker search modal
├── tests/
│   ├── e2e-test-runner.ts                 # E2E Test Suite Runner (Tiers 1-4)
│   └── role-adaptive-dashboard.test.ts    # Comprehensive API, role, and UX integration tests
├── PROJECT.md                             # Global project specification & milestone tracking
├── TEST_INFRA.md                          # E2E Test track methodology & scenario definitions
└── TEST_READY.md                          # E2E Test suite ready publication
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Server Build Stability | Add `.unref()` to periodic outbox interval in `server/index.ts` so `npm run build` exits cleanly | M1 | Survey (explorer 3) |
| 2 | Workforce Statistics API | `GET /api/hrms/stats`: Total active headcount, newly onboarded this month, department breakdown | M1 | R2 / R4 |
| 3 | Operational Activity Stream API | `GET /api/hrms/activity`: Query `audit_events` for recent HR and staff operations | M1 | R2 / R4 |
| 4 | Direct Onboarding API | `POST /api/hrms/employees`: Insert employee, initial leave balances, account credentials, and audit event | M1 | R2 / R4 |
| 5 | Public Directory API | `GET /api/hrms/directory`: Sanitized search across coworker name, department, or manager email | M1 | R1 / R4 |
| 6 | Security Tracker & Logout API | `GET /api/hrms/auth/security-log` and `POST /api/hrms/auth/logout` | M1 | R1 / R4 |
| 7 | Profile Status Synchronization | `PATCH /api/hrms/employees/:id`: Synchronize `employee_accounts.is_active` when updating status/offboarding | M1 | R2 / R4 |
| 8 | Test Script Setup | Add `"test": "tsx --test tests/**/*.test.ts"` in `package.json` | M1 | Survey (explorer 3) |
| 9 | Auth Context & Session Management | `src/context/AuthContext.tsx`: Role normalization (`hr_admin` vs `employee`), login/logout, cookie/localStorage sync | M2 | R1 / R3 |
| 10 | Employee Welcome & Identity Header | Tailwind identity banner displaying "Welcome back, [Name]", photo/initials, title, department, employee ID | M2 | R1 |
| 11 | Employee My Profile Card | Personal HR metadata: Hire date, Manager name, Phone, Corporate email, Employment status | M2 | R1 |
| 12 | Employee Quick Links Panel | Visual navigation buttons powered by Lucide / Phosphor Icons leading to allowed spaces (Directory) | M2 | R1 |
| 13 | Employee Security Notification Tracker | Security panel showing last login timestamp, session status, and IP/session details | M2 | R1 |
| 14 | Employee Directory Search & Actions | Search public corporate directory, toggle dark/light theme, secure logout | M2 | R1 |
| 15 | Employee Access Restrictions | Strict isolation: regular employees cannot view admin settings, edit profiles, or see private peer salaries/BVNs | M2 | R1 |
| 16 | Admin Workforce Statistics Panel | Analytical counters from SQLite: Total Active Headcount, Newly Onboarded This Month, Departmental Breakdown Chart | M3 | R2 |
| 17 | Admin Navigation Controls | Privileged sidebar links: "Onboard New Employee", "Manage Systems", view switcher | M3 | R2 |
| 18 | Admin Recent Activity Stream | Live operational feed displaying latest system operations from `audit_events` | M3 | R2 |
| 19 | Admin Onboarding Module | React 19 interactive form modal: full name, email, salary, department, role, creating SQLite record | M3 | R2 |
| 20 | Admin Edit & Terminate Profiles | Directory table actions to update department, change employment status (active/inactive offboarding), change manager | M3 | R2 |
| 21 | Admin Global Search & Filter | Filter employees by inactive status, hiring date range, department, and keywords | M3 | R2 |
| 22 | Role-Adaptive View Switching | Mount `EmployeeView` or `AdminView` based on `user.role === 'hr_admin'` | M4 | R3 |
| 23 | Route Mounting | Mount unified role-adaptive dashboard on `#hrms` and `#staffportal` routes in `src/App.tsx` | M4 | R3 |
| 24 | Framer Motion Animations | Smooth view transitions (`AnimatePresence`), panel entrances, and modal/onboarding state changes | M4 | R3 |
| 25 | E2E Test Suite Creation | Opaque-box requirement-driven test suite (Tiers 1-4) published via `TEST_READY.md` | E2E Track | Acceptance Criteria |
| 26 | Final E2E Test Pass & Adversarial Hardening | Pass 100% of E2E tests + Tier 5 adversarial stress testing | Final Milestone | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design & implement opaque-box test runner and test cases (Tiers 1-4), publish `TEST_READY.md` | None | DONE |
| M1 | Backend HRMS & Database Extensions | Build stability fix, stats API, activity API, direct onboarding API, public directory API, security-log & logout API, status sync | None | IN_PROGRESS |
| M2 | Auth Context & Employee Dashboard | `AuthContext`, `EmployeeView`, Welcome Header, Profile Card, Quick Links, Security Tracker, Directory Search, Theme Toggle, Logout | M1 (contracts defined) | PLANNED |
| M3 | HR Administrator Dashboard | `AdminView`, Workforce Statistics Panel, Admin Nav Controls, Recent Activity Stream, Onboarding Form Modal, Profile Edit & Offboard Modal, Global Filter | M1 | PLANNED |
| M4 | Role-Adaptive Routing & Motion Integration | `RoleAdaptiveDashboard`, Framer Motion transitions/entrances, `App.tsx` route integration for `#hrms` and `#staffportal` | M2, M3 | PLANNED |
| Final | 100% E2E Pass & Adversarial Hardening | Phase 1: Pass 100% of E2E test suite (Tiers 1-4); Phase 2: Tier 5 adversarial hardening | M4, E2E Track | PLANNED |

## Interface Contracts
### Backend ↔ Frontend API Contracts

#### 1. `GET /api/hrms/stats`
- Headers: `x-nexus-role: HR Administrator` or authenticated session cookie
- Response:
  ```json
  {
    "success": true,
    "stats": {
      "activeHeadcount": number,
      "totalHeadcount": number,
      "newlyOnboardedThisMonth": number,
      "currentMonth": "YYYY-MM",
      "departmentsCount": number,
      "departmentBreakdown": [
        {
          "departmentId": string,
          "departmentName": string,
          "departmentCode": string,
          "totalHeadcount": number,
          "activeHeadcount": number,
          "inactiveHeadcount": number
        }
      ]
    }
  }
  ```

#### 2. `GET /api/hrms/activity`
- Query Params: `limit` (default: 25)
- Response:
  ```json
  {
    "success": true,
    "activities": [
      {
        "id": string,
        "userName": string,
        "userRole": string,
        "action": string,
        "entityType": string,
        "entityId": string,
        "details": object,
        "createdAt": string
      }
    ]
  }
  ```

#### 3. `POST /api/hrms/employees`
- Body:
  ```json
  {
    "first_name": string,
    "last_name": string,
    "official_email": string,
    "personal_email": string,
    "phone": string,
    "department_id": string,
    "designation_id": string,
    "salary_monthly": number,
    "reporting_manager_id": string,
    "branch_location": string,
    "employment_type": string,
    "employment_status": "Active" | "Probation" | "Inactive",
    "date_of_joining": "YYYY-MM-DD",
    "role": "Employee" | "HR Administrator",
    "password"?: string
  }
  ```
- Response (201):
  ```json
  {
    "success": true,
    "message": "Employee onboarded successfully",
    "employee": {
      "id": string,
      "employee_number": string,
      "first_name": string,
      "last_name": string,
      "official_email": string,
      "role": string
    }
  }
  ```

#### 4. `GET /api/hrms/directory`
- Query Params: `search` (string matching coworker name, department, or manager email), `department_id`
- Response: Strictly sanitized public employee array (no salaries, no BVN/NIN, no bank account details).
  ```json
  {
    "success": true,
    "directory": [
      {
        "id": string,
        "employee_number": string,
        "first_name": string,
        "last_name": string,
        "official_email": string,
        "phone": string,
        "branch_location": string,
        "date_of_joining": string,
        "employment_status": string,
        "department_name": string,
        "department_code": string,
        "designation_title": string,
        "reporting_manager_name": string,
        "reporting_manager_email": string
      }
    ]
  }
  ```

#### 5. `GET /api/hrms/auth/security-log` & `POST /api/hrms/auth/logout`
- `GET /api/hrms/auth/security-log` -> `{ success: true, lastLogin: string, activeSession: boolean, ipAddress: string, recentLogins: Array }`
- `POST /api/hrms/auth/logout` -> `{ success: true, message: "Logged out" }` with `Set-Cookie` expired.

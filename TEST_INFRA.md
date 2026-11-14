# E2E Test Infra: Remix Nexus Finance Phase 1

## Test Philosophy
- Opaque-box, requirement-driven derived directly from ORIGINAL_REQUEST.md.
- No dependency on internal implementation structures.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory & Test Matrix
| # | Feature | Source (requirement) | Tier 1 (Coverage >=5) | Tier 2 (Boundary >=5) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|----------------------|:---------------------:|:---------------------:|:-----------------:|:-----------------:|
| 1 | Employee Identity & Welcome Header | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | My Profile Card (HR Metadata) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Quick Links Panel | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Security Notification Tracker | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Public Directory Search & Privacy | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 6 | Theme Switcher & Logout Session | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 7 | Regular Employee Access Restrictions | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 8 | Workforce Statistics (Headcount, Onboarded, Depts) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 9 | Admin Navigation Controls | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 10 | Recent Activity Stream (`audit_events`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 11 | Onboarding Form Module & SQLite Insert | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 12 | Profile Edit, Manager Change & Inactive Offboarding | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 13 | Global Search & Admin Filtering | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 14 | Role-Adaptive Rendering (`AdminView` vs `EmployeeView`) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 15 | App Route Mounts (`#hrms` & `#staffportal`) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 16 | Framer Motion Animations & Modal States | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 17 | Backend HRMS API Integration & DB Persistence | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Node 24 native test runner executed via `npx tsx tests/e2e-test-runner.ts` and `npm test` (`tsx --test tests/**/*.test.ts`).
- **Pass/Fail Semantics**: Process exits with code 0 if and only if all assertions across all 4 tiers pass. Any assertion failure causes non-zero exit code.
- **Directory Layout**:
  - `tests/e2e-test-runner.ts`: Unified test runner orchestrating all test suites.
  - `tests/tier1-feature-coverage.test.ts`: Equivalence class happy-path tests (>=5 per feature).
  - `tests/tier2-boundary-corner.test.ts`: Boundary conditions, invalid payloads, missing fields, 401/403/404, SQL safety.
  - `tests/tier3-cross-feature.test.ts`: Pairwise integration (Onboard -> Stat increments -> Directory update -> Activity stream -> Offboard).
  - `tests/tier4-application-scenarios.test.ts`: Realistic end-to-end sessions (Employee Self-Service Session, HR Command Center Session).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Standard Employee Daily Self-Service Flow | F1, F2, F3, F4, F5, F6, F7, F14, F15 | High |
| 2 | HR Administrator Workforce Oversight & Onboarding Flow | F8, F9, F10, F11, F13, F14, F16, F17 | High |
| 3 | Employee Department Transfer & Offboarding Lifecycle | F8, F10, F12, F13, F17 | High |
| 4 | Adversarial Security & Role Boundary Enforcement | F5, F7, F11, F12, F17 | High |
| 5 | Theme Preference & Session Termination Lifecycle | F4, F6, F14, F15, F17 | Medium |

## Coverage Thresholds
- Tier 1: ≥85 test cases (17 features × 5)
- Tier 2: ≥85 test cases (17 features × 5)
- Tier 3: ≥17 cross-feature interaction test cases
- Tier 4: ≥5 full-scale real-world workload scenarios
- Total: ≥192 verified test cases

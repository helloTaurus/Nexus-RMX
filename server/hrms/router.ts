import { Router } from 'express';
import { requireRecruitmentAuth } from '../auth.ts';
import {
  staffLogin,
  staffLogout,
  getEmployeeAccount,
  provisionEmployeeAccount,
  getEmployeeSecurityLog
} from './auth.ts';
import {
  listEmployees,
  createEmployee,
  getEmployeeDetails,
  convertApplicantToEmployee,
  updateEmployee,
  getWorkforceStats,
  getRecentActivityStream,
  getPublicDirectory
} from './employees.ts';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createDesignation,
  updateDesignation,
  deleteDesignation
} from './departments.ts';
import {
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  verifyEmployeeDocument
} from './documents.ts';
import {
  listLeaveTypes,
  listLeaveRequests,
  submitLeaveRequest,
  actionLeaveRequest
} from './leaves.ts';
import {
  listExpenseClaims,
  getExpenseClaimDetails,
  createExpenseClaim,
  uploadExpenseReceipt,
  actionExpenseClaim
} from './expenses.ts';
import {
  listAppraisalCycles,
  createAppraisalCycle,
  updateAppraisalCycle,
  listAppraisals,
  getAppraisalDetails,
  initializeAppraisal,
  selfEvaluateAppraisal,
  managerReviewAppraisal,
  finalizeAppraisal
} from './appraisals.ts';
import {
  listRoles,
  createRole,
  updateRolePermissions,
  listPermissions
} from './roles.ts';

export const hrmsRouter = Router();

// =========================================================================
// =========================================================================
// Staff Authentication (ESS & HR Portal Access)
// =========================================================================
hrmsRouter.post('/auth/login', staffLogin);
hrmsRouter.post('/auth/logout', staffLogout);

// =========================================================================
// Permissive Auth for HRMS & Self-Service
// =========================================================================
// All authenticated roles (Employee, Manager, HR Admin, Recruitment Admin)
hrmsRouter.use(requireRecruitmentAuth([
  'Recruitment Administrator',
  'HR Reviewer',
  'Hiring Manager',
  'Staff Editor',
  'HR Administrator',
  'Line Manager',
  'Employee'
]));

// Security & Session Log
hrmsRouter.get('/auth/security-log', getEmployeeSecurityLog);
hrmsRouter.get('/me/security-log', getEmployeeSecurityLog);

// Workforce Statistics & Live Activity Feeds
hrmsRouter.get('/stats', getWorkforceStats);
hrmsRouter.get('/activity', getRecentActivityStream);

// Public Employee Directory (strictly sanitized)
hrmsRouter.get('/directory', getPublicDirectory);

// =========================================================================
// 1. Employee Management (Nexus People Core)
// =========================================================================
hrmsRouter.get('/employees', listEmployees);
hrmsRouter.post('/employees', createEmployee);
hrmsRouter.get('/employees/:id', getEmployeeDetails);
hrmsRouter.patch('/employees/:id', updateEmployee);
hrmsRouter.post('/employees/convert-applicant', convertApplicantToEmployee);

// Employee Account Provisioning
hrmsRouter.get('/employees/:id/account', getEmployeeAccount);
hrmsRouter.post('/employees/:id/account', provisionEmployeeAccount);

// =========================================================================
// 2. Organization Structure (Departments & Designations)
// =========================================================================
hrmsRouter.get('/departments', listDepartments);
hrmsRouter.post('/departments', createDepartment);
hrmsRouter.patch('/departments/:id', updateDepartment);
hrmsRouter.delete('/departments/:id', deleteDepartment);

hrmsRouter.post('/designations', createDesignation);
hrmsRouter.patch('/designations/:id', updateDesignation);
hrmsRouter.delete('/designations/:id', deleteDesignation);

// =========================================================================
// 3. Employee Documents & Onboarding Vault
// =========================================================================
hrmsRouter.get('/documents/:id/download', downloadEmployeeDocument);
hrmsRouter.post('/employees/:employeeId/documents', uploadEmployeeDocument);
hrmsRouter.patch('/documents/:id/verify', verifyEmployeeDocument);

// =========================================================================
// 4. Time & Leave Management (Zoho People Time-Off)
// =========================================================================
hrmsRouter.get('/leaves/types', listLeaveTypes);
hrmsRouter.get('/leaves/requests', listLeaveRequests);
hrmsRouter.post('/leaves/requests', submitLeaveRequest);
hrmsRouter.patch('/leaves/requests/:id/action', actionLeaveRequest);

// =========================================================================
// 5. Expense Claims & Reimbursements (Zoho Expense)
// =========================================================================
hrmsRouter.get('/expenses/claims', listExpenseClaims);
hrmsRouter.get('/expenses/claims/:id', getExpenseClaimDetails);
hrmsRouter.post('/expenses/claims', createExpenseClaim);
hrmsRouter.post('/expenses/items/:itemId/receipt', uploadExpenseReceipt);
hrmsRouter.patch('/expenses/claims/:id/action', actionExpenseClaim);

// =========================================================================
// 6. Performance Appraisals & Scorecards (Zoho People Performance)
// =========================================================================
hrmsRouter.get('/appraisals/cycles', listAppraisalCycles);
hrmsRouter.post('/appraisals/cycles', createAppraisalCycle);
hrmsRouter.patch('/appraisals/cycles/:id', updateAppraisalCycle);
hrmsRouter.get('/appraisals', listAppraisals);
hrmsRouter.get('/appraisals/:id', getAppraisalDetails);
hrmsRouter.post('/appraisals', initializeAppraisal);
hrmsRouter.patch('/appraisals/:id/self-evaluate', selfEvaluateAppraisal);
hrmsRouter.patch('/appraisals/:id/manager-review', managerReviewAppraisal);
hrmsRouter.patch('/appraisals/:id/finalize', finalizeAppraisal);

// =========================================================================
// 7. Granular Roles & Access Control Management (Super Admin & System Admin)
// =========================================================================
hrmsRouter.get('/roles', listRoles);
hrmsRouter.post('/roles', createRole);
hrmsRouter.put('/roles/:id/permissions', updateRolePermissions);
hrmsRouter.get('/permissions', listPermissions);

export default hrmsRouter;

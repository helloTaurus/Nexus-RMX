import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Briefcase,
  CalendarCheck,
  Receipt,
  Trophy,
  Target,
  ChartBar,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  LockKey,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  Funnel,
  ArrowRight,
  ArrowLeft,
  ArrowCounterClockwise,
  CaretRight,
  Plus,
  Eye,
  Key,
  IdentificationCard,
  Buildings,
  CurrencyNgn,
  Star,
  Sparkle,
  FloppyDisk,
  X,
  FileText,
  SignOut,
  WarningCircle,
  Check
} from '@phosphor-icons/react';
import { RecruitmentCms } from './RecruitmentCms';

interface HrmsExecutivePortalProps {
  onNavigate: (view: string, productId?: string) => void;
  initialViewMode?: 'hr_admin' | 'employee_self_service';
}

export const HrmsExecutivePortal: React.FC<HrmsExecutivePortalProps> = ({
  onNavigate,
  initialViewMode = 'hr_admin'
}) => {
  // Operational View Mode: 'hr_admin' | 'employee_self_service'
  const [viewMode, setViewMode] = useState<'hr_admin' | 'employee_self_service'>(initialViewMode);

  // Navigation tabs in HRMS
  const [activeTab, setActiveTab] = useState<'recruitment' | 'workforce' | 'leaves' | 'expenses' | 'appraisals' | 'roles'>(
    initialViewMode === 'employee_self_service' ? 'leaves' : 'workforce'
  );

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
      if (initialViewMode === 'employee_self_service' && activeTab === 'recruitment') {
        setActiveTab('leaves');
      }
    }
  }, [initialViewMode]);

  // Staff Portal Login Modal State
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  const [staffLoginForm, setStaffLoginForm] = useState({ username: '', password: '' });
  const [staffLoginLoading, setStaffLoginLoading] = useState(false);
  const [staffLoginError, setStaffLoginError] = useState<string | null>(null);

  // Currently logged-in / active staff profile for ESS actions
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

  // Global HRMS Data State
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Modals state for Workforce & Org
  const [isEditEmpModalOpen, setIsEditEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editEmpLoading, setEditEmpLoading] = useState(false);

  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({
    first_name: '',
    last_name: '',
    official_email: '',
    phone: '',
    department_id: '',
    designation_id: '',
    salary_monthly: 450000,
    branch_location: 'Abuja Head Office (CBD)',
    employment_type: 'Full-Time',
    bank_name: 'Guaranty Trust Bank (GTB)',
    bank_account_number: '',
    bvn_nin_masked: '222***891'
  });
  const [addEmpLoading, setAddEmpLoading] = useState(false);

  const [isUserAccessModalOpen, setIsUserAccessModalOpen] = useState(false);
  const [userAccessEmp, setUserAccessEmp] = useState<any | null>(null);
  const [userAccessForm, setUserAccessForm] = useState({
    username: '',
    password: '',
    role: 'Employee',
    is_active: 1
  });
  const [userAccessLoading, setUserAccessLoading] = useState(false);

  // Granular Roles & Access Permissions State (Super Admin)
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<any[]>([]);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<any | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);
  const [saveRoleLoading, setSaveRoleLoading] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '', permissions: [] as string[] });
  const [createRoleLoading, setCreateRoleLoading] = useState(false);

  // Distinct Role Capabilities Evaluator
  const hasPermission = (permissionKey: string): boolean => {
    if (viewMode === 'employee_self_service') {
      return ['request_leaves', 'self_appraisal', 'submit_expenses', 'view_own_profile'].includes(permissionKey);
    }
    const role = (activeStaff?.role || '').toLowerCase();
    if (role === 'super_admin' || role === 'super administrator' || role === 'hr administrator') {
      return true; // Super Admin has unrestricted access
    }
    if (Array.isArray(activeStaff?.permissions) && activeStaff.permissions.length > 0) {
      return activeStaff.permissions.includes(permissionKey);
    }
    // Fallback role permissions
    if (role === 'hr_manager' || role === 'hr manager') {
      return !['manage_roles', 'manage_system'].includes(permissionKey);
    }
    if (role === 'hr_staff' || role === 'hr staff') {
      return ['manage_employees', 'onboard_employee', 'request_leaves', 'self_appraisal', 'submit_expenses'].includes(permissionKey);
    }
    if (role === 'finance_admin' || role === 'finance & expense administrator') {
      return ['manage_expenses', 'approve_expenses', 'disburse_expenses', 'request_leaves', 'self_appraisal', 'submit_expenses'].includes(permissionKey);
    }
    return ['request_leaves', 'self_appraisal', 'submit_expenses', 'view_own_profile'].includes(permissionKey);
  };

  // Organization & Teams (Departments & Designations) Modal
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', head_employee_id: '' });
  const [isNewDept, setIsNewDept] = useState(false);
  const [orgSaveLoading, setOrgSaveLoading] = useState(false);

  const [editingDesig, setEditingDesig] = useState<any | null>(null);
  const [desigForm, setDesigForm] = useState({
    department_id: '',
    title: '',
    cadre_level: 'Mid-Level',
    grade_code: 'L3',
    daily_expense_cap: 35000
  });
  const [isNewDesig, setIsNewDesig] = useState(false);

  // Leaves State
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [applyLeaveForm, setApplyLeaveForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    days_requested: 3,
    relief_employee_id: '',
    reason: ''
  });
  const [applyLeaveLoading, setApplyLeaveLoading] = useState(false);

  // Expenses State
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [isCreateClaimOpen, setIsCreateClaimOpen] = useState(false);
  const [newClaimForm, setNewClaimForm] = useState({
    employee_id: '',
    title: '',
    purpose: '',
    items: [
      { category: 'Fuel & Transport', amount: 15000, merchant_name: 'TotalEnergies CBD', description: 'Branch inspection visit', expense_date: new Date().toISOString().split('T')[0] }
    ]
  });
  const [createClaimLoading, setCreateClaimLoading] = useState(false);

  // Performance Appraisals State
  const [appraisalCycles, setAppraisalCycles] = useState<any[]>([]);
  const [appraisalsList, setAppraisalsList] = useState<any[]>([]);
  const [selectedAppraisalDossier, setSelectedAppraisalDossier] = useState<any | null>(null);
  const [loadingAppraisals, setLoadingAppraisals] = useState(false);
  const [isInitAppraisalOpen, setIsInitAppraisalOpen] = useState(false);
  const [initAppraisalForm, setInitAppraisalForm] = useState({
    cycle_id: '',
    employee_id: '',
    reviewer_id: ''
  });
  const [initAppraisalLoading, setInitAppraisalLoading] = useState(false);

  // Appraisal Evaluation Modal
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalType, setEvalType] = useState<'self' | 'manager' | 'hr_finalize'>('self');
  const [evalAppraisal, setEvalAppraisal] = useState<any | null>(null);
  const [evalScore, setEvalScore] = useState<number>(4.5);
  const [evalComments, setEvalComments] = useState<string>('');
  const [evalRecommendation, setEvalRecommendation] = useState<string>('Retain & Bonus');
  const [evalKpiScores, setEvalKpiScores] = useState<Record<string, number>>({});
  const [evalLoading, setEvalLoading] = useState(false);

  // Toast / Status Message
  const [statusBanner, setStatusBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showBanner = (message: string, type: 'success' | 'error' = 'success') => {
    setStatusBanner({ message, type });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Handle Staff Login via backend /api/hrms/auth/login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoginLoading(true);
    setStaffLoginError(null);
    try {
      const res = await fetch('/api/hrms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffLoginForm)
      });
      const data = await res.json();
      if (data.success && data.staff) {
        setActiveStaff({
          id: data.staff.employeeId,
          employee_number: data.staff.employeeNumber,
          first_name: data.staff.firstName,
          last_name: data.staff.lastName,
          official_email: data.staff.email,
          role: data.staff.role,
          department_name: data.staff.departmentName,
          designation_title: data.staff.designationTitle,
          daily_expense_cap: data.staff.dailyExpenseCap || 35000,
          permissions: data.staff.permissions || []
        });
        if (data.staff.role === 'Super Administrator' || data.staff.role === 'super_admin' || data.staff.role === 'HR Administrator' || data.staff.role === 'HR Manager') {
          setViewMode('hr_admin');
        } else {
          setViewMode('employee_self_service');
        }
        window.location.hash = (data.staff.role === 'Super Administrator' || data.staff.role === 'super_admin' || data.staff.role === 'HR Administrator' || data.staff.role === 'HR Manager') ? '#hrms' : '#staffportal';
        setIsStaffLoginOpen(false);
        setStaffLoginForm({ username: '', password: '' });
        showBanner(`Authenticated as ${data.staff.fullName} (${data.staff.role})!`);
      } else {
        setStaffLoginError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setStaffLoginError(err.message || 'Unable to connect to login server.');
    } finally {
      setStaffLoginLoading(false);
    }
  };

  // Fetch Roles and Permissions Catalog
  const fetchRolesAndPermissions = async () => {
    try {
      const [rRes, pRes] = await Promise.all([
        fetch('/api/hrms/roles', { headers: getAuthHeaders() }),
        fetch('/api/hrms/permissions', { headers: getAuthHeaders() })
      ]);
      const rData = await rRes.json();
      const pData = await pRes.json();
      if (rData.success && rData.roles) {
        setRolesList(rData.roles);
        if (!selectedRoleForEdit && rData.roles.length > 0) {
          setSelectedRoleForEdit(rData.roles[0]);
          setEditingRolePermissions(rData.roles[0].permissions || []);
        }
      }
      if (pData.success && pData.permissions) {
        setPermissionsCatalog(pData.permissions);
      }
    } catch (err) {
      console.error('Failed to load roles and permissions:', err);
    }
  };

  // Toggle specific permission during role editing
  const handleTogglePermission = (permId: string) => {
    if (editingRolePermissions.includes(permId)) {
      setEditingRolePermissions(editingRolePermissions.filter((p) => p !== permId));
    } else {
      setEditingRolePermissions([...editingRolePermissions, permId]);
    }
  };

  // Super Admin saves updated capabilities for a role
  const handleSaveRolePermissions = async () => {
    if (!selectedRoleForEdit) return;
    setSaveRoleLoading(true);
    try {
      const res = await fetch(`/api/hrms/roles/${selectedRoleForEdit.id}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissions: editingRolePermissions })
      });
      const data = await res.json();
      if (data.success) {
        showBanner(`Permissions updated for role '${selectedRoleForEdit.name}'!`);
        fetchRolesAndPermissions();
      } else {
        showBanner(data.error || 'Failed to update role permissions.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Error updating role permissions.', 'error');
    } finally {
      setSaveRoleLoading(false);
    }
  };

  // Super Admin creates a new custom role
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) return;
    setCreateRoleLoading(true);
    try {
      const res = await fetch('/api/hrms/roles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRoleForm)
      });
      const data = await res.json();
      if (data.success) {
        showBanner(`Custom role '${newRoleForm.name}' created successfully!`);
        setIsCreateRoleOpen(false);
        setNewRoleForm({ name: '', description: '', permissions: [] });
        fetchRolesAndPermissions();
      } else {
        showBanner(data.error || 'Failed to create role.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Error creating role.', 'error');
    } finally {
      setCreateRoleLoading(false);
    }
  };

  // Auth headers for HRMS API requests
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-nexus-role': viewMode === 'hr_admin' ? 'HR Administrator' : (activeStaff?.role || 'Employee'),
      'x-nexus-user': `${activeStaff?.first_name || 'Staff'} ${activeStaff?.last_name || 'User'}`,
      'x-nexus-staff-id': activeStaff?.id || ''
    };
  };

  // Fetch Employees & Departments
  const fetchEmployeesAndDepts = async () => {
    setLoadingEmployees(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch('/api/hrms/employees?limit=100', { headers: getAuthHeaders() }),
        fetch('/api/hrms/departments', { headers: getAuthHeaders() })
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        if (empData.success && empData.employees) {
          setEmployees(empData.employees);
          // If activeStaff not configured, default to first employee
          if (!activeStaff?.id && empData.employees.length > 0) {
            setActiveStaff(empData.employees[0]);
          }
        }
      }

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        if (deptData.success && deptData.departments) {
          setDepartments(deptData.departments);
        }
      }
    } catch (err) {
      console.error('Failed to load employees & depts:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch Leaves
  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const [reqRes, typesRes] = await Promise.all([
        fetch('/api/hrms/leaves/requests', { headers: getAuthHeaders() }),
        fetch('/api/hrms/leaves/types', { headers: getAuthHeaders() })
      ]);

      if (reqRes.ok) {
        const d = await reqRes.json();
        if (d.success) setLeaveRequests(d.requests || []);
      }
      if (typesRes.ok) {
        const d = await typesRes.json();
        if (d.success) setLeaveTypes(d.leaveTypes || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Fetch Expenses
  const fetchExpenses = async () => {
    setLoadingClaims(true);
    try {
      const res = await fetch('/api/hrms/expenses/claims', { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setClaims(d.claims || []);
      }
    } catch (err) {
      console.error('Failed to fetch expense claims:', err);
    } finally {
      setLoadingClaims(false);
    }
  };

  // Fetch Appraisals
  const fetchAppraisals = async () => {
    setLoadingAppraisals(true);
    try {
      const [cyclesRes, apprsRes] = await Promise.all([
        fetch('/api/hrms/appraisals/cycles', { headers: getAuthHeaders() }),
        fetch('/api/hrms/appraisals', { headers: getAuthHeaders() })
      ]);

      if (cyclesRes.ok) {
        const d = await cyclesRes.json();
        if (d.success) setAppraisalCycles(d.cycles || []);
      }
      if (apprsRes.ok) {
        const d = await apprsRes.json();
        if (d.success) setAppraisalsList(d.appraisals || []);
      }
    } catch (err) {
      console.error('Failed to fetch appraisals:', err);
    } finally {
      setLoadingAppraisals(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEmployeesAndDepts();
    fetchLeaves();
    fetchExpenses();
    fetchAppraisals();
    fetchRolesAndPermissions();
  }, [viewMode]);

  // Keep activeStaff in sync with employee list if updated
  useEffect(() => {
    if (activeStaff?.id && employees.length > 0) {
      const matched = employees.find((e) => e.id === activeStaff.id);
      if (matched) {
        setActiveStaff((prev: any) => ({
          ...prev,
          ...matched,
          fullName: `${matched.first_name} ${matched.last_name}`
        }));
      }
    }
  }, [employees]);

  // ---------------------------------------------------------------------------
  // HANDLERS: EMPLOYEE EDIT & USER ACCESS
  // ---------------------------------------------------------------------------
  const handleOpenEditEmployee = (emp: any) => {
    setEditingEmployee({ ...emp });
    setIsEditEmpModalOpen(true);
  };

  const handleSaveEmployeeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setEditEmpLoading(true);
    try {
      const res = await fetch(`/api/hrms/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          first_name: editingEmployee.first_name,
          last_name: editingEmployee.last_name,
          phone: editingEmployee.phone,
          department_id: editingEmployee.department_id,
          designation_id: editingEmployee.designation_id,
          reporting_manager_id: editingEmployee.reporting_manager_id || null,
          employment_status: editingEmployee.employment_status,
          salary_monthly: Number(editingEmployee.salary_monthly) || 0,
          branch_location: editingEmployee.branch_location,
          bank_name: editingEmployee.bank_name,
          bank_account_number: editingEmployee.bank_account_number,
          bvn_nin_masked: editingEmployee.bvn_nin_masked,
          emergency_contact_name: editingEmployee.emergency_contact_name,
          emergency_contact_phone: editingEmployee.emergency_contact_phone
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(`Profile for ${editingEmployee.first_name} ${editingEmployee.last_name} updated successfully!`);
        setIsEditEmpModalOpen(false);
        fetchEmployeesAndDepts();
      } else {
        showBanner(d.error || 'Failed to update employee.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error updating employee profile.', 'error');
    } finally {
      setEditEmpLoading(false);
    }
  };

  const handleOpenUserAccess = async (emp: any) => {
    setUserAccessEmp(emp);
    setUserAccessForm({
      username: emp.official_email,
      password: '',
      role: emp.department_id === 'dept-hcm' ? 'HR Administrator' : 'Employee',
      is_active: 1
    });

    try {
      const res = await fetch(`/api/hrms/employees/${emp.id}/account`, { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.account) {
          setUserAccessForm({
            username: d.account.username || emp.official_email,
            password: '',
            role: d.account.role || 'Employee',
            is_active: d.account.is_active ?? 1
          });
        }
      }
    } catch (err) {
      console.error('Failed to load user account:', err);
    }

    setIsUserAccessModalOpen(true);
  };

  const handleSaveUserAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccessEmp) return;

    setUserAccessLoading(true);
    try {
      const res = await fetch(`/api/hrms/employees/${userAccessEmp.id}/account`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userAccessForm)
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(`Login credentials for ${userAccessEmp.first_name} saved!`);
        setIsUserAccessModalOpen(false);
      } else {
        showBanner(d.error || 'Failed to provision credentials.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error.', 'error');
    } finally {
      setUserAccessLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: ORGANIZATION (DEPARTMENTS & DESIGNATIONS)
  // ---------------------------------------------------------------------------
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaveLoading(true);
    try {
      const isCreate = isNewDept;
      const url = isCreate ? '/api/hrms/departments' : `/api/hrms/departments/${editingDept.id}`;
      const method = isCreate ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(deptForm)
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(isCreate ? 'New department created!' : 'Department updated!');
        setEditingDept(null);
        setIsNewDept(false);
        fetchEmployeesAndDepts();
      } else {
        showBanner(d.error || 'Failed to save department.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Error saving department.', 'error');
    } finally {
      setOrgSaveLoading(false);
    }
  };

  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaveLoading(true);
    try {
      const isCreate = isNewDesig;
      const url = isCreate ? '/api/hrms/designations' : `/api/hrms/designations/${editingDesig.id}`;
      const method = isCreate ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...desigForm,
          daily_expense_cap: Number(desigForm.daily_expense_cap) || 25000
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(isCreate ? 'New designation created!' : 'Designation updated!');
        setEditingDesig(null);
        setIsNewDesig(false);
        fetchEmployeesAndDepts();
      } else {
        showBanner(d.error || 'Failed to save designation.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Error saving designation.', 'error');
    } finally {
      setOrgSaveLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: LEAVES (EMPLOYEE SELF-SERVICE + HR APPROVE/DECLINE)
  // ---------------------------------------------------------------------------
  const handleOpenApplyLeave = () => {
    const currentEmpId = activeStaff?.id || employees[0]?.id || '';
    const defaultType = leaveTypes[0]?.id || 'leave-annual';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 4);

    setApplyLeaveForm({
      employee_id: currentEmpId,
      leave_type_id: defaultType,
      start_date: tomorrow.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      days_requested: 3,
      relief_employee_id: '',
      reason: 'Personal annual leave rest & family recharge'
    });
    setIsApplyLeaveOpen(true);
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyLeaveLoading(true);
    try {
      const res = await fetch('/api/hrms/leaves/requests', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...applyLeaveForm,
          days_requested: Number(applyLeaveForm.days_requested) || 1
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner('Leave request submitted! Routed to Line Manager & HR for sign-off.');
        setIsApplyLeaveOpen(false);
        fetchLeaves();
      } else {
        showBanner(d.error || 'Failed to submit leave request.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Error submitting leave request.', 'error');
    } finally {
      setApplyLeaveLoading(false);
    }
  };

  const handleActionLeave = async (requestId: string, action: 'Approve' | 'Reject') => {
    const comment = prompt(
      action === 'Approve'
        ? 'Enter optional executive approval remarks:'
        : 'Enter mandatory reason for declining leave request:'
    );
    if (action === 'Reject' && (!comment || !comment.trim())) {
      showBanner('A decline reason is required.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/hrms/leaves/requests/${requestId}/action`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action,
          rejection_reason: comment || null,
          action_by_name: `${activeStaff?.first_name || 'HR'} ${activeStaff?.last_name || 'Admin'}`
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(`Leave request marked as ${action}d! Entitlement balances updated.`);
        fetchLeaves();
      } else {
        showBanner(d.error || 'Failed to action leave request.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error.', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: EXPENSE CLAIMS (SUBMIT & APPROVE)
  // ---------------------------------------------------------------------------
  const handleOpenCreateClaim = () => {
    const currentEmpId = activeStaff?.id || employees[0]?.id || '';
    setNewClaimForm({
      employee_id: currentEmpId,
      title: 'Branch Audit & Client Consultation Per-Diem',
      purpose: 'Field loan verifications and stakeholder meetings in Wuse & Garki.',
      items: [
        {
          category: 'Fuel & Transport',
          amount: 22000,
          merchant_name: 'TotalEnergies Wuse II',
          description: 'Official transport reimbursement for portfolio verification',
          expense_date: new Date().toISOString().split('T')[0]
        }
      ]
    });
    setIsCreateClaimOpen(true);
  };

  const handleSubmitExpenseClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClaimLoading(true);
    try {
      const res = await fetch('/api/hrms/expenses/claims', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newClaimForm)
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner('Expense claim submitted for financial review!');
        setIsCreateClaimOpen(false);
        fetchExpenses();
      } else {
        showBanner(d.error || 'Failed to submit expense claim.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Error submitting claim.', 'error');
    } finally {
      setCreateClaimLoading(false);
    }
  };

  const handleActionExpenseClaim = async (claimId: string, action: 'Approve' | 'Reject' | 'Disburse') => {
    try {
      const res = await fetch(`/api/hrms/expenses/claims/${claimId}/action`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(`Claim status changed to: ${action}d`);
        fetchExpenses();
      } else {
        showBanner(d.error || 'Failed to action expense claim.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error.', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: APPRAISALS (EVALUATION, SCORECARDS & CALIBRATION)
  // ---------------------------------------------------------------------------
  const handleOpenAppraisalDossier = async (apprId: string) => {
    try {
      const res = await fetch(`/api/hrms/appraisals/${apprId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setSelectedAppraisalDossier(d);
        }
      }
    } catch (err) {
      console.error('Failed to fetch appraisal dossier:', err);
    }
  };

  const handleOpenEvalModal = (appraisal: any, type: 'self' | 'manager' | 'hr_finalize') => {
    setEvalAppraisal(appraisal);
    setEvalType(type);
    if (type === 'self') {
      setEvalScore(appraisal.self_rating || 4.5);
      setEvalComments(appraisal.self_comments || '');
    } else if (type === 'manager') {
      setEvalScore(appraisal.manager_rating || 4.7);
      setEvalComments(appraisal.manager_comments || '');
    } else {
      setEvalScore(appraisal.hr_final_score || 4.8);
      setEvalRecommendation(appraisal.hr_recommendation || 'Retain & Bonus');
    }
    setIsEvalModalOpen(true);
  };

  const handleSubmitAppraisalEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalAppraisal) return;

    setEvalLoading(true);
    try {
      let endpoint = '';
      let body: any = {};

      if (evalType === 'self') {
        endpoint = `/api/hrms/appraisals/${evalAppraisal.id}/self-evaluate`;
        body = { self_rating: evalScore, self_comments: evalComments };
      } else if (evalType === 'manager') {
        endpoint = `/api/hrms/appraisals/${evalAppraisal.id}/manager-review`;
        body = { manager_rating: evalScore, manager_comments: evalComments };
      } else {
        endpoint = `/api/hrms/appraisals/${evalAppraisal.id}/finalize`;
        body = { hr_final_score: evalScore, hr_recommendation: evalRecommendation };
      }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner(d.message || 'Appraisal evaluation recorded!');
        setIsEvalModalOpen(false);
        fetchAppraisals();
        if (selectedAppraisalDossier?.appraisal?.id === evalAppraisal.id) {
          handleOpenAppraisalDossier(evalAppraisal.id);
        }
      } else {
        showBanner(d.error || 'Failed to submit evaluation.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error.', 'error');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleInitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitAppraisalLoading(true);
    try {
      const res = await fetch('/api/hrms/appraisals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(initAppraisalForm)
      });

      const d = await res.json();
      if (res.ok && d.success) {
        showBanner('Performance appraisal scorecard initialized for employee!');
        setIsInitAppraisalOpen(false);
        fetchAppraisals();
      } else {
        showBanner(d.error || 'Failed to initialize appraisal.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error.', 'error');
    } finally {
      setInitAppraisalLoading(false);
    }
  };

  // Filtered employees for workforce directory
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !employeeSearch ||
      emp.first_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.official_email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(employeeSearch.toLowerCase());

    const matchesDept = !selectedDeptFilter || emp.department_id === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#07090e] text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* =========================================================================
            TOP EXECUTIVE HEADER & ROLE SELECTOR
           ========================================================================= */}
        <div className="p-6 rounded-3xl bg-neutral-900/80 border border-white/10 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 backdrop-blur-xl">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${viewMode === 'employee_self_service' ? 'bg-blue-400' : 'bg-[#00e575]'} animate-pulse`} />
              <span className={`font-extrabold uppercase tracking-wider font-mono ${viewMode === 'employee_self_service' ? 'text-blue-400' : 'text-[#00e575]'}`}>
                {viewMode === 'employee_self_service' ? 'NEXUS STAFF SELF-SERVICE PORTAL (#staffportal)' : 'NEXUS ENTERPRISE HRMS (#hrms)'}
              </span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-400 font-medium">
                {viewMode === 'employee_self_service' ? 'Leave Requests, Expense Claims & Appraisals' : 'Zoho People & Expense Architecture'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              {viewMode === 'employee_self_service' ? 'Staff Self-Service Portal' : 'Human Capital & Staff Operations'}
            </h1>
          </div>

          {/* Quick Context & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            {/* View Mode Toggle: Admin vs Employee Self-Service */}
            <div className="flex items-center p-1 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold">
              <button
                onClick={() => {
                  setViewMode('hr_admin');
                  window.location.hash = '#hrms';
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'hr_admin'
                    ? 'bg-[#00e575] text-black font-bold shadow-md shadow-[#00e575]/20'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>HR Admin (#hrms)</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('employee_self_service');
                  window.location.hash = '#staffportal';
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'employee_self_service'
                    ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Portal (#staffportal)</span>
              </button>
            </div>

            {/* Active Staff Persona Selector & Login */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400 hidden sm:inline">Active Staff:</span>
              <select
                value={activeStaff?.id || ''}
                onChange={(e) => {
                  const selected = employees.find((x) => x.id === e.target.value);
                  if (selected) setActiveStaff(selected);
                }}
                className="bg-neutral-800 text-white border border-white/20 rounded px-2 py-1 text-xs font-medium cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_number}) - {emp.department_name || 'Staff'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsStaffLoginOpen(true)}
                className="ml-1 px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Authenticate with staff username/email and password"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>

            {/* Public Links */}
            <button
              onClick={() => onNavigate('home')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Site</span>
            </button>

            <button
              onClick={() => onNavigate('cms')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Marketing CMS</span>
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusBanner && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg animate-in fade-in duration-200 ${
              statusBanner.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusBanner.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" weight="bold" />
              ) : (
                <WarningCircle className="w-5 h-5 text-red-400 shrink-0" weight="bold" />
              )}
              <span>{statusBanner.message}</span>
            </div>
            <button
              onClick={() => setStatusBanner(null)}
              className="p-1 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            HRMS MASTER MODULE TABS
           ========================================================================= */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('workforce')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'workforce'
                ? (viewMode === 'employee_self_service' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#00e575] text-black shadow-lg shadow-[#00e575]/20')
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" weight="bold" />
            <span>{viewMode === 'employee_self_service' ? 'My Profile & Directory' : `Workforce & Org (${employees.length})`}</span>
          </button>

          {viewMode === 'hr_admin' && (
            <button
              onClick={() => setActiveTab('recruitment')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'recruitment'
                  ? 'bg-[#00e575] text-black shadow-lg shadow-[#00e575]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" weight="bold" />
              <span>Recruitment &amp; Talent</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'leaves'
                ? (viewMode === 'employee_self_service' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#00e575] text-black shadow-lg shadow-[#00e575]/20')
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4" weight="bold" />
            <span>{viewMode === 'employee_self_service' ? 'My Time-Off & Leaves' : `Time-Off & Leaves (${leaveRequests.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? (viewMode === 'employee_self_service' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#00e575] text-black shadow-lg shadow-[#00e575]/20')
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" weight="bold" />
            <span>{viewMode === 'employee_self_service' ? 'My Expense Claims' : `Nexus Expense (${claims.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('appraisals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'appraisals'
                ? (viewMode === 'employee_self_service' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#00e575] text-black shadow-lg shadow-[#00e575]/20')
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" weight="bold" />
            <span>{viewMode === 'employee_self_service' ? 'My Appraisals & Scorecards' : 'Appraisals & Scorecards'}</span>
          </button>

          {viewMode === 'hr_admin' && hasPermission('manage_roles') && (
            <button
              onClick={() => {
                fetchRolesAndPermissions();
                setActiveTab('roles');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-[#00e575] text-black shadow-lg shadow-[#00e575]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" weight="bold" />
              <span>Roles &amp; Access Control</span>
            </button>
          )}
        </div>

        {/* =========================================================================
            MODULE 1: RECRUITMENT & TALENT (EMBEDDED FULL RECRUITMENT PORTAL)
           ========================================================================= */}
        {activeTab === 'recruitment' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
              <span>
                <strong>Integrated Recruitment Pipeline:</strong> Applicants receiving offers can be onboarded into the Employee register with 1-click (&ldquo;Convert to Staff&rdquo;) transferring their verified CV and generating company credentials.
              </span>
              <button
                onClick={() => {
                  fetchEmployeesAndDepts();
                  setActiveTab('workforce');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#00e575] text-black font-bold text-xs uppercase cursor-pointer"
              >
                View Staff Register
              </button>
            </div>
            <RecruitmentCms userRole={viewMode === 'hr_admin' ? 'Master Admin' : 'Hiring Manager'} />
          </div>
        )}

        {/* =========================================================================
            MODULE 2: WORKFORCE & ORGANIZATION (PEOPLE)
           ========================================================================= */}
        {activeTab === 'workforce' && (
          <div className="space-y-6">
            {/* Top Toolbar: Search, Dept Filter, Action Buttons */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID (NX-...), or email..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#00e575]"
                  />
                </div>

                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white text-xs font-medium cursor-pointer"
                >
                  <option value="">All Departments ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {viewMode === 'hr_admin' && (
                <div className="flex items-center gap-3">
                  {hasPermission('manage_departments') && (
                    <button
                      onClick={() => setIsOrgModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Buildings className="w-4 h-4 text-[#00e575]" />
                      <span>Manage Teams &amp; Cadres</span>
                    </button>
                  )}

                  {hasPermission('onboard_employee') && (
                    <button
                      onClick={() => setIsAddEmpModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all"
                    >
                      <UserPlus className="w-4 h-4" weight="bold" />
                      <span>Add Employee</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Employee Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[#00e575] bg-[#00e575]/10 px-2 py-0.5 rounded">
                            {emp.employee_number}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              emp.employment_status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {emp.employment_status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">
                          {emp.first_name} {emp.last_name}
                        </h3>
                        <p className="text-xs text-slate-400">{emp.designation_title || 'Officer'}</p>
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm font-bold text-[#00e575]">
                        {emp.first_name?.[0]}
                        {emp.last_name?.[0]}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Department:</span>
                        <span className="font-medium text-slate-200">{emp.department_name || 'Operations'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Official Email:</span>
                        <span className="font-mono text-[11px] text-slate-300">{emp.official_email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Branch:</span>
                        <span>{emp.branch_location || 'Abuja HQ'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Cadre &amp; Per-Diem:</span>
                        <span className="text-[#00e575] font-semibold">
                          &#8358;{(emp.daily_expense_cap || 25000).toLocaleString()}/day
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Employee Action Buttons */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    {hasPermission('edit_employee') ? (
                      <button
                        onClick={() => handleOpenEditEmployee(emp)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer transition-colors"
                      >
                        <PencilSimple className="w-3.5 h-3.5 text-[#00e575]" />
                        <span>Edit Details</span>
                      </button>
                    ) : (
                      <span className="flex-1 text-center text-[11px] text-slate-500 py-1.5">
                        Read-Only View
                      </span>
                    )}

                    {(hasPermission('manage_system') || hasPermission('manage_roles')) && (
                      <button
                        onClick={() => handleOpenUserAccess(emp)}
                        className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer transition-colors"
                        title="Manage Portal Credentials"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>Access</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODULE 3: TIME & LEAVE MANAGEMENT (TIME-OFF)
           ========================================================================= */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Staff Time-Off &amp; Leave Requests</h2>
                <p className="text-xs text-slate-400">
                  Submit personal leave applications or manage departmental approval queues.
                </p>
              </div>

              <button
                onClick={handleOpenApplyLeave}
                className="px-4 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all"
              >
                <CalendarCheck className="w-4 h-4" weight="bold" />
                <span>Initiate Leave Request</span>
              </button>
            </div>

            {/* Leave Requests Table */}
            <div className="rounded-2xl bg-neutral-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Relief Officer</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{req.employee_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{req.employee_number} &bull; {req.department_name}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {req.leave_type_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{req.days_requested} Business Days</div>
                          <div className="text-[11px] text-slate-400">{req.start_date} to {req.end_date}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {req.relief_employee_name || 'None Specified'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-300" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              req.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : req.status === 'Rejected'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {req.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                            {req.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                            {req.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                            <span>{req.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {viewMode === 'hr_admin' && req.status === 'Pending' ? (
                            hasPermission('approve_leaves') ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleActionLeave(req.id, 'Approve')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleActionLeave(req.id, 'Reject')}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition-colors cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Pending Approval (Restricted)</span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No action needed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                          No leave applications filed yet. Click &ldquo;Initiate Leave Request&rdquo; to test submission.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODULE 4: EXPENSE CLAIMS & REIMBURSEMENTS (ZOHO EXPENSE)
           ========================================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Expense Reporting &amp; Per-Diem Reimbursements</h2>
                <p className="text-xs text-slate-400">
                  Itemized corporate expenses with designated cadre daily allowances.
                </p>
              </div>

              <button
                onClick={handleOpenCreateClaim}
                className="px-4 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all"
              >
                <Receipt className="w-4 h-4" weight="bold" />
                <span>Submit Expense Claim</span>
              </button>
            </div>

            {/* Claims Table */}
            <div className="rounded-2xl bg-neutral-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Claim Ref &amp; Title</th>
                      <th className="py-3 px-4">Claimant</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{claim.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{claim.claim_number}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{claim.employee_name}</div>
                          <div className="text-[11px] text-slate-500">{claim.department_name}</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                          {claim.purpose}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#00e575]">
                          &#8358;{(claim.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              claim.status === 'Disbursed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : claim.status === 'Approved'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : claim.status === 'Rejected'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            <span>{claim.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {viewMode === 'hr_admin' && (claim.status === 'Submitted' || claim.status === 'Draft') ? (
                            hasPermission('approve_expenses') ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleActionExpenseClaim(claim.id, 'Approve')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 cursor-pointer transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleActionExpenseClaim(claim.id, 'Reject')}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 cursor-pointer transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Pending Approval (Restricted)</span>
                            )
                          ) : viewMode === 'hr_admin' && claim.status === 'Approved' ? (
                            hasPermission('manage_expenses') ? (
                              <button
                                onClick={() => handleActionExpenseClaim(claim.id, 'Disburse')}
                                className="px-2.5 py-1 rounded-lg bg-[#00e575]/20 hover:bg-[#00e575]/30 text-[#00e575] text-xs font-bold border border-[#00e575]/30 cursor-pointer transition-colors"
                              >
                                Disburse Funds
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Approved (Pending Disbursement)</span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">{claim.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {claims.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                          No expense claims filed yet. Click &ldquo;Submit Expense Claim&rdquo; to test per-diem validation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODULE 5: PERFORMANCE APPRAISALS & SCORECARDS
           ========================================================================= */}
        {activeTab === 'appraisals' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Performance Appraisals &amp; KPI Scorecards</h2>
                <p className="text-xs text-slate-400">
                  Annual &amp; quarterly review cycles, KPI weightages, self-ratings, and HR calibration.
                </p>
              </div>

              {viewMode === 'hr_admin' && hasPermission('initiate_appraisals') && (
                <button
                  onClick={() => {
                    const cycleId = appraisalCycles[0]?.id || '';
                    const empId = employees[0]?.id || '';
                    setInitAppraisalForm({ cycle_id: cycleId, employee_id: empId, reviewer_id: '' });
                    setIsInitAppraisalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" weight="bold" />
                  <span>Initialize Staff Appraisal</span>
                </button>
              )}
            </div>

            {/* Appraisals Grid / Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Appraisals List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl bg-neutral-900/60 border border-white/10 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/[0.04] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Cycle</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Ratings</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {appraisalsList.map((appr) => (
                          <tr
                            key={appr.id}
                            onClick={() => handleOpenAppraisalDossier(appr.id)}
                            className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{appr.employee_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{appr.employee_number} &bull; {appr.department_name}</div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-300 max-w-[140px] truncate">
                              {appr.cycle_title}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  appr.status === 'Finalized'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : appr.status === 'HR-Calibration'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : appr.status === 'Manager-Review'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                <span>{appr.status}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-300 text-[11px]">
                                Self: <span className="font-bold text-white">{appr.self_rating || '-'}/5</span> &bull; 
                                Final: <span className="font-bold text-[#00e575]">{appr.hr_final_score || '-'}/5</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {appr.status === 'Self-Review' && (
                                  <button
                                    onClick={() => handleOpenEvalModal(appr, 'self')}
                                    className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-bold border border-blue-500/30 cursor-pointer"
                                  >
                                    Self-Rate
                                  </button>
                                )}
                                {appr.status === 'Manager-Review' && (
                                  <button
                                    onClick={() => handleOpenEvalModal(appr, 'manager')}
                                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold border border-purple-500/30 cursor-pointer"
                                  >
                                    Mgr-Rate
                                  </button>
                                )}
                                {viewMode === 'hr_admin' && hasPermission('review_appraisals') && (appr.status === 'HR-Calibration' || appr.status === 'Self-Review' || appr.status === 'Manager-Review') && (
                                  <button
                                    onClick={() => handleOpenEvalModal(appr, 'hr_finalize')}
                                    className="px-2.5 py-1 rounded-lg bg-[#00e575]/20 hover:bg-[#00e575]/30 text-[#00e575] text-[11px] font-bold border border-[#00e575]/30 cursor-pointer"
                                  >
                                    Finalize
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Appraisal KPI Scorecard Dossier */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#00e575]" />
                    <span>KPI Target Scorecard</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedAppraisalDossier?.appraisal?.employee_name || 'Select from list'}
                  </span>
                </div>

                {selectedAppraisalDossier ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Appraisal Status:</span>
                        <span className="font-bold text-[#00e575]">{selectedAppraisalDossier.appraisal.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">HR Recommendation:</span>
                        <span className="font-bold text-amber-300">{selectedAppraisalDossier.appraisal.hr_recommendation || 'Pending'}</span>
                      </div>
                      {selectedAppraisalDossier.appraisal.self_comments && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Employee Self-Reflection:</span>
                          <p className="text-slate-300 text-xs italic mt-0.5">&ldquo;{selectedAppraisalDossier.appraisal.self_comments}&rdquo;</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-[11px] uppercase font-bold text-slate-400">Evaluated KPI Breakdown</div>
                      {selectedAppraisalDossier.kpis?.map((kpi: any) => (
                        <div key={kpi.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-200">
                            <span>{kpi.kpi_name}</span>
                            <span className="text-[#00e575] font-mono text-[11px]">{kpi.weightage_percent}% Weight</span>
                          </div>
                          <div className="text-[11px] text-slate-400">Target: {kpi.target_metric}</div>
                          <div className="flex items-center gap-4 pt-1 text-[11px] font-mono">
                            <span className="text-blue-300">Self: {kpi.self_score ? `${kpi.self_score}/5` : 'N/A'}</span>
                            <span className="text-purple-300">Manager: {kpi.manager_score ? `${kpi.manager_score}/5` : 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Click any appraisal in the table to inspect individual KPI metrics and feedback.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODULE 7: SYSTEM ROLES & ACCESS CONTROL (SUPER ADMIN GOVERNANCE)
           ========================================================================= */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00e575] animate-pulse" />
                  <span className="text-xs uppercase font-mono tracking-widest text-[#00e575] font-bold">
                    Super Administrator Clearance &bull; Role-Based Access Control (RBAC)
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">System Roles &amp; Capability Assignment</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Super Admin can define customized user roles and assign distinct operational abilities across system modules.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewRoleForm({ name: '', description: '', permissions: ['request_leaves', 'self_appraisal', 'submit_expenses', 'view_own_profile'] });
                  setIsCreateRoleOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" weight="bold" />
                <span>Create Custom Role</span>
              </button>
            </div>

            {/* 2-Column Roles & Capabilities Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Roles Registry (4 cols) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Configured System Roles ({rolesList.length})
                </div>

                <div className="space-y-2.5">
                  {rolesList.map((role) => {
                    const isSelected = selectedRoleForEdit?.id === role.id;
                    const permsCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
                    return (
                      <div
                        key={role.id}
                        onClick={() => {
                          setSelectedRoleForEdit(role);
                          setEditingRolePermissions(Array.isArray(role.permissions) ? [...role.permissions] : []);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-neutral-900/50 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-sm font-bold text-white">{role.name}</h3>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              role.is_system
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {role.is_system ? 'System Core' : 'Custom'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
                          {role.description || 'Custom corporate role.'}
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-white/5">
                          <span className="text-slate-500">Rights:</span>
                          <span className="text-[#00e575] font-bold">
                            {permsCount} / {permissionsCatalog.length} abilities
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Permission Matrix for Selected Role (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {selectedRoleForEdit ? (
                  <div className="p-6 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-6 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{selectedRoleForEdit.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">({selectedRoleForEdit.id})</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedRoleForEdit.description}</p>
                      </div>

                      <button
                        onClick={handleSaveRolePermissions}
                        disabled={saveRoleLoading}
                        className="px-5 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <FloppyDisk className="w-4 h-4" weight="bold" />
                        <span>{saveRoleLoading ? 'Saving...' : 'Save Role Capabilities'}</span>
                      </button>
                    </div>

                    {/* Permissions Grouped by Category */}
                    <div className="space-y-5">
                      {['Security & Access Control', 'Employee Management', 'Organization Architecture', 'Time & Leave Management', 'Performance & Appraisals', 'Expense & Disbursements', 'Staff Self-Service'].map((cat) => {
                        const permsInCat = permissionsCatalog.filter((p) => p.category === cat);
                        if (permsInCat.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span>{cat}</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {permsInCat.map((perm) => {
                                const isChecked = editingRolePermissions.includes(perm.id);
                                const isSuperLocked = selectedRoleForEdit.id === 'super_admin' && perm.id === 'manage_roles';
                                return (
                                  <label
                                    key={perm.id}
                                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer select-none ${
                                      isChecked
                                        ? 'bg-blue-500/10 border-blue-500/40 text-white'
                                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/15'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={isSuperLocked}
                                      checked={isChecked}
                                      onChange={() => handleTogglePermission(perm.id)}
                                      className="mt-0.5 rounded bg-neutral-800 text-[#00e575] focus:ring-0 cursor-pointer"
                                    />
                                    <div>
                                      <div className="text-xs font-bold leading-snug">{perm.name}</div>
                                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{perm.description}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-slate-500 text-xs rounded-2xl bg-neutral-900/40 border border-white/10">
                    Select a system role on the left to inspect and configure assigned capability matrices.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 1: EDIT EMPLOYEE PROFILE (PERSONAL, CADRE, BANKING)
           ========================================================================= */}
        {isEditEmpModalOpen && editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-[#0c1017] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <PencilSimple className="w-5 h-5 text-[#00e575]" />
                    <span>Edit Staff Profile &bull; {editingEmployee.employee_number}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Modify cadre, assigned department, monthly salary, and banking.</p>
                </div>
                <button
                  onClick={() => setIsEditEmpModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployeeProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">First Name</label>
                    <input
                      type="text"
                      value={editingEmployee.first_name || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editingEmployee.last_name || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editingEmployee.phone || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Branch Office</label>
                    <input
                      type="text"
                      value={editingEmployee.branch_location || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, branch_location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Department</label>
                    <select
                      value={editingEmployee.department_id || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, department_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Employment Status</label>
                    <select
                      value={editingEmployee.employment_status || 'Active'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Probationary">Probationary</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Monthly Salary (NGN)</label>
                    <input
                      type="number"
                      value={editingEmployee.salary_monthly || 0}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, salary_monthly: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none focus:border-[#00e575]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editingEmployee.bank_name || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, bank_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={editingEmployee.bank_account_number || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, bank_account_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none focus:border-[#00e575]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">BVN / NIN (Masked)</label>
                    <input
                      type="text"
                      value={editingEmployee.bvn_nin_masked || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, bvn_nin_masked: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none focus:border-[#00e575]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditEmpModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editEmpLoading}
                    className="px-6 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold shadow-lg shadow-[#00e575]/25 cursor-pointer disabled:opacity-50"
                  >
                    {editEmpLoading ? 'Saving...' : 'Update Staff Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: USER ACCOUNT ACCESS & PIN PROVISIONING
           ========================================================================= */}
        {isUserAccessModalOpen && userAccessEmp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0c1017] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Staff Portal Access Credentials</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Provision login credentials for {userAccessEmp.first_name} {userAccessEmp.last_name}
                  </p>
                </div>
                <button
                  onClick={() => setIsUserAccessModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUserAccess} className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Login Username / Official Email
                  </label>
                  <input
                    type="text"
                    value={userAccessForm.username}
                    onChange={(e) => setUserAccessForm({ ...userAccessForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none focus:border-[#00e575]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Password or Access PIN (Leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. nexus2026"
                    value={userAccessForm.password}
                    onChange={(e) => setUserAccessForm({ ...userAccessForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Default for new team members: <strong className="text-white">nexus2026</strong>
                  </span>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Assigned System Role &amp; Security Clearance</label>
                  <select
                    value={userAccessForm.role}
                    onChange={(e) => setUserAccessForm({ ...userAccessForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                  >
                    {rolesList && rolesList.length > 0 ? (
                      rolesList.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name} ({r.description ? r.description.slice(0, 45) + '...' : 'System Role'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Employee">Employee (Self-Service: Leaves &amp; Expenses)</option>
                        <option value="HR Staff">HR Staff (Onboarding &amp; Workforce Directory)</option>
                        <option value="HR Manager">HR Manager (Leave &amp; Appraisal Approvals)</option>
                        <option value="Finance Admin">Finance Admin (Expense Claims &amp; Disbursement)</option>
                        <option value="System Administrator">System Administrator (Systems &amp; Users)</option>
                        <option value="Super Administrator">Super Administrator (Full System &amp; Role Governance)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active_chk"
                    checked={userAccessForm.is_active === 1}
                    onChange={(e) => setUserAccessForm({ ...userAccessForm, is_active: e.target.checked ? 1 : 0 })}
                    className="rounded bg-neutral-800 text-[#00e575] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="is_active_chk" className="text-slate-300 cursor-pointer">
                    Account is Active &amp; Authorized to Login
                  </label>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsUserAccessModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={userAccessLoading}
                    className="px-6 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold shadow-lg shadow-[#00e575]/25 cursor-pointer disabled:opacity-50"
                  >
                    {userAccessLoading ? 'Saving...' : 'Save Credentials'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: INITIATE LEAVE REQUEST (EMPLOYEE SELF-SERVICE)
           ========================================================================= */}
        {isApplyLeaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-[#0c1017] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-[#00e575]" />
                    <span>Initiate Leave Application</span>
                  </h3>
                  <p className="text-xs text-slate-400">Request time-off with live entitlement verification.</p>
                </div>
                <button
                  onClick={() => setIsApplyLeaveOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitLeaveRequest} className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Applying Staff Member</label>
                  <select
                    value={applyLeaveForm.employee_id}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Leave Category</label>
                  <select
                    value={applyLeaveForm.leave_type_id}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, leave_type_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Max {t.default_days_per_year} Days/Year)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={applyLeaveForm.start_date}
                      onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">End Date</label>
                    <input
                      type="date"
                      value={applyLeaveForm.end_date}
                      onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Business Days</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={applyLeaveForm.days_requested}
                      onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, days_requested: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none focus:border-[#00e575]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Relief Colleague</label>
                    <select
                      value={applyLeaveForm.relief_employee_id}
                      onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, relief_employee_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                    >
                      <option value="">-- Select Handover Staff --</option>
                      {employees
                        .filter((e) => e.id !== applyLeaveForm.employee_id)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">Reason &amp; Handover Notes</label>
                  <textarea
                    rows={3}
                    value={applyLeaveForm.reason}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                    placeholder="Explain emergency or reason for taking leave..."
                    required
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsApplyLeaveOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyLeaveLoading}
                    className="px-6 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold shadow-lg shadow-[#00e575]/25 cursor-pointer disabled:opacity-50"
                  >
                    {applyLeaveLoading ? 'Submitting...' : 'Dispatch Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 4: PERFORMANCE EVALUATION (SELF, MGR, HR FINAL)
           ========================================================================= */}
        {isEvalModalOpen && evalAppraisal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-[#0c1017] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#00e575]" />
                    <span>
                      {evalType === 'self' && 'Staff Performance Self-Evaluation'}
                      {evalType === 'manager' && 'Line Manager Evaluation & Scoring'}
                      {evalType === 'hr_finalize' && 'HR Strategic Calibration & Decision'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluating {evalAppraisal.employee_name} ({evalAppraisal.employee_number})
                  </p>
                </div>
                <button
                  onClick={() => setIsEvalModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitAppraisalEval} className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Rating Score: <strong className="text-[#00e575] text-sm font-mono">{evalScore} / 5.0</strong>
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={evalScore}
                    onChange={(e) => setEvalScore(parseFloat(e.target.value))}
                    className="w-full accent-[#00e575] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1.0 (Needs Improvement)</span>
                    <span>3.0 (Meets Expectations)</span>
                    <span>5.0 (Role Model)</span>
                  </div>
                </div>

                {evalType === 'hr_finalize' && (
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Final Executive Recommendation
                    </label>
                    <select
                      value={evalRecommendation}
                      onChange={(e) => setEvalRecommendation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white cursor-pointer"
                    >
                      <option value="Retain & Bonus">Retain &amp; Award Merit Bonus</option>
                      <option value="Promote Cadre">Promote to Senior Cadre Level</option>
                      <option value="Salary Increment">Base Salary Increment</option>
                      <option value="Performance Improvement Plan (PIP)">Performance Improvement Plan (PIP)</option>
                      <option value="None">Maintain Status Quo</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    {evalType === 'self' && 'Accomplishments & Key Delivery Highlights'}
                    {evalType === 'manager' && 'Manager Qualitative Feedback'}
                    {evalType === 'hr_finalize' && 'HR Calibration Notes & Governance Justification'}
                  </label>
                  <textarea
                    rows={4}
                    value={evalComments}
                    onChange={(e) => setEvalComments(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                    placeholder="Enter review statements and metric achievements..."
                    required
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEvalModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={evalLoading}
                    className="px-6 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold shadow-lg shadow-[#00e575]/25 cursor-pointer disabled:opacity-50"
                  >
                    {evalLoading ? 'Saving...' : 'Submit Evaluation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 5: MANAGE TEAMS & CADRES (DEPARTMENTS & DESIGNATIONS)
           ========================================================================= */}
        {isOrgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-4xl bg-[#0c1017] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Buildings className="w-5 h-5 text-[#00e575]" />
                    <span>Organization Structure: Departments &amp; Job Cadres</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Edit department details, HOD appointments, job titles, and per-diem caps.
                  </p>
                </div>
                <button
                  onClick={() => setIsOrgModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Department Editor Form */}
              {(isNewDept || editingDept) && (
                <form onSubmit={handleSaveDepartment} className="p-4 rounded-2xl bg-white/[0.04] border border-[#00e575]/30 space-y-3 text-xs">
                  <div className="font-bold text-white text-sm">
                    {isNewDept ? 'Create New Department' : `Edit Department: ${editingDept.name}`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Code</label>
                      <input
                        type="text"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. FIN"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-white font-mono"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Department Name</label>
                      <input
                        type="text"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        placeholder="e.g. Treasury & Financial Control"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Description</label>
                    <input
                      type="text"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      placeholder="Mandate and scope of operations..."
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDept(null);
                        setIsNewDept(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={orgSaveLoading}
                      className="px-4 py-1.5 rounded-lg bg-[#00e575] text-black font-bold cursor-pointer"
                    >
                      Save Department
                    </button>
                  </div>
                </form>
              )}

              {/* Departments List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">Active Departments</h4>
                  {!isNewDept && !editingDept && (
                    <button
                      onClick={() => {
                        setDeptForm({ name: '', code: '', description: '', head_employee_id: '' });
                        setIsNewDept(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#00e575] border border-white/10 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Department</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departments.map((dept) => (
                    <div key={dept.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#00e575] bg-[#00e575]/10 px-2 py-0.5 rounded text-[11px]">
                            {dept.code}
                          </span>
                          <span className="font-bold text-white">{dept.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptForm({
                              name: dept.name,
                              code: dept.code,
                              description: dept.description || '',
                              head_employee_id: dept.head_employee_id || ''
                            });
                            setIsNewDept(false);
                          }}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          title="Edit Department"
                        >
                          <PencilSimple className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px]">{dept.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-500">
                        <span>Staff Assigned: <strong className="text-slate-300">{dept.active_employee_count || 0}</strong></span>
                        <span>Designations: <strong className="text-slate-300">{dept.designations?.length || 0}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: CREATE CUSTOM SYSTEM ROLE & ASSIGN CAPABILITIES (SUPER ADMIN)
           ========================================================================= */}
        {isCreateRoleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#0c1017] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Create Custom Role &amp; Assign Rights</h3>
                    <p className="text-xs text-slate-400">Define a new corporate security role with tailored capabilities</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateRoleOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoleSubmit} className="space-y-5 text-xs overflow-y-auto pr-1 flex-1">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Role Title / Identifier <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit Lead, Operations Supervisor, Risk Analyst"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Role Scope / Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detail the operational mandate and departmental authority of this role..."
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] uppercase font-bold text-slate-400 block">
                      Assign Capabilities &amp; System Rights ({newRoleForm.permissions.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allKeys = permissionsCatalog.length > 0
                            ? permissionsCatalog.map(p => p.id)
                            : [
                                'manage_roles', 'manage_system', 'view_audit_logs', 'manage_employees',
                                'onboard_employee', 'edit_employee', 'offboard_employee', 'manage_departments',
                                'approve_leaves', 'request_leaves', 'initiate_appraisals', 'review_appraisals',
                                'self_appraisal', 'manage_expenses', 'approve_expenses', 'disburse_expenses',
                                'submit_expenses', 'view_own_profile'
                              ];
                          setNewRoleForm({ ...newRoleForm, permissions: allKeys });
                        }}
                        className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">&bull;</span>
                      <button
                        type="button"
                        onClick={() => setNewRoleForm({ ...newRoleForm, permissions: [] })}
                        className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {Array.from(new Set(permissionsCatalog.map((p) => p.category))).map((cat) => (
                      <div key={cat} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 block">
                          {cat}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {permissionsCatalog
                            .filter((p) => p.category === cat)
                            .map((perm) => {
                              const isChecked = newRoleForm.permissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-purple-500/10 border-purple-500/40 text-white'
                                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewRoleForm({
                                          ...newRoleForm,
                                          permissions: [...newRoleForm.permissions, perm.id]
                                        });
                                      } else {
                                        setNewRoleForm({
                                          ...newRoleForm,
                                          permissions: newRoleForm.permissions.filter((p) => p !== perm.id)
                                        });
                                      }
                                    }}
                                    className="mt-0.5 rounded bg-neutral-800 text-purple-500 focus:ring-0 cursor-pointer"
                                  />
                                  <div>
                                    <span className="font-semibold text-xs text-white block">{perm.name}</span>
                                    <span className="text-[10px] text-slate-400 block leading-tight">{perm.description}</span>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoleOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRoleLoading || !newRoleForm.name.trim()}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {createRoleLoading ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Create System Role</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAFF PORTAL AUTHENTICATION MODAL (#staffportal)
           ========================================================================= */}
        {isStaffLoginOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Staff Portal Sign-In</h3>
                    <p className="text-xs text-slate-400">Nexus Staff Self-Service (#staffportal)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStaffLoginOpen(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {staffLoginError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <WarningCircle className="w-4 h-4 shrink-0" />
                  <span>{staffLoginError}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Official Email / Staff ID / Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NX-0001 or amina.bello@nexusfinance.com"
                    value={staffLoginForm.username}
                    onChange={(e) => setStaffLoginForm({ ...staffLoginForm, username: e.target.value })}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Password / Access PIN
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password or PIN"
                    value={staffLoginForm.password}
                    onChange={(e) => setStaffLoginForm({ ...staffLoginForm, password: e.target.value })}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={staffLoginLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {staffLoginLoading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <LockKey className="w-4 h-4" />
                  )}
                  <span>Sign In to Staff Portal</span>
                </button>
              </form>

              {/* Quick Persona Switcher for immediate preview */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium">Or select an active staff persona:</span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setActiveStaff(emp);
                        setViewMode('employee_self_service');
                        window.location.hash = '#staffportal';
                        setIsStaffLoginOpen(false);
                        showBanner(`Active staff switched to ${emp.first_name} ${emp.last_name}`);
                      }}
                      className="w-full text-left p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-white">{emp.first_name} {emp.last_name}</span>
                        <span className="text-[10px] text-slate-400 block">{emp.designation_title || emp.role} &bull; {emp.employee_number}</span>
                      </div>
                      <span className="text-[10px] text-blue-400 font-mono font-bold">Select</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

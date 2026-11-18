import React, { useState, useEffect } from 'react';
import {
  Users,
  Receipt,
  CalendarCheck,
  Buildings,
  CurrencyNgn,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  CaretRight,
  UploadSimple,
  Eye,
  Check,
  X,
  WarningCircle,
  Briefcase
} from '@phosphor-icons/react';

interface HrmsPortalProps {
  userRole?: string;
  onNavigateToRecruitment?: () => void;
}

export const HrmsPortal: React.FC<HrmsPortalProps> = ({ userRole = 'Recruitment Administrator', onNavigateToRecruitment }) => {
  // Active HRMS Sub-Tab: 'people' | 'leaves' | 'expenses'
  const [hrmsTab, setHrmsTab] = useState<'people' | 'leaves' | 'expenses'>('people');

  // EMPLOYEES STATE
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Selected Employee Dossier Modal
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isDossierLoading, setIsDossierLoading] = useState(false);
  const [dossierDocuments, setDossierDocuments] = useState<any[]>([]);
  const [dossierLeaveBalances, setDossierLeaveBalances] = useState<any[]>([]);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [newDocType, setNewDocType] = useState('Guarantor Form 1');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [uploadDocLoading, setUploadDocLoading] = useState(false);

  // Manual Add Employee Modal
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

  // LEAVE STATE
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('');
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [applyLeaveForm, setApplyLeaveForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    days_requested: 5,
    reason: ''
  });
  const [applyLeaveLoading, setApplyLeaveLoading] = useState(false);

  // EXPENSE STATE
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState('');
  const [selectedClaimDetails, setSelectedClaimDetails] = useState<any | null>(null);
  const [isCreateClaimOpen, setIsCreateClaimOpen] = useState(false);
  const [newClaimForm, setNewClaimForm] = useState({
    employee_id: '',
    title: '',
    purpose: '',
    items: [
      { category: 'Fuel & Transport', amount: 15000, merchant_name: 'TotalEnergies CBD', description: 'Fuel for field inspection', expense_date: new Date().toISOString().split('T')[0] }
    ]
  });
  const [createClaimLoading, setCreateClaimLoading] = useState(false);

  // Action status messages
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-nexus-role': userRole,
    'x-nexus-user': 'HR Operations Lead'
  };

  const showNotification = (msg: string, isError: boolean = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setTimeout(() => setActionErrorMsg(null), 5000);
    } else {
      setActionSuccessMsg(msg);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // 1. Fetch Employees & Departments
  const fetchEmployeesAndDepts = async () => {
    setLoadingEmployees(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch(`/api/hrms/employees?search=${encodeURIComponent(employeeSearch)}&department_id=${encodeURIComponent(selectedDeptFilter)}&status=${encodeURIComponent(selectedStatusFilter)}`, { headers: authHeaders }),
        fetch('/api/hrms/departments', { headers: authHeaders })
      ]);
      const empData = await empRes.json();
      const deptData = await deptRes.json();

      if (empData.success) setEmployees(empData.employees || []);
      if (deptData.success) {
        setDepartments(deptData.departments || []);
        if (deptData.departments?.length > 0 && !newEmpForm.department_id) {
          const firstDept = deptData.departments[0];
          setNewEmpForm(prev => ({
            ...prev,
            department_id: firstDept.id,
            designation_id: firstDept.designations?.[0]?.id || ''
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch workforce data:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // 2. Fetch Leaves
  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const [reqRes, typesRes] = await Promise.all([
        fetch(`/api/hrms/leaves/requests?status=${encodeURIComponent(leaveStatusFilter)}`, { headers: authHeaders }),
        fetch('/api/hrms/leaves/types', { headers: authHeaders })
      ]);
      const reqData = await reqRes.json();
      const typesData = await typesRes.json();

      if (reqData.success) setLeaveRequests(reqData.requests || []);
      if (typesData.success) {
        setLeaveTypes(typesData.leaveTypes || []);
        if (typesData.leaveTypes?.length > 0 && !applyLeaveForm.leave_type_id) {
          setApplyLeaveForm(prev => ({ ...prev, leave_type_id: typesData.leaveTypes[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  // 3. Fetch Expenses
  const fetchExpenses = async () => {
    setLoadingClaims(true);
    try {
      const res = await fetch(`/api/hrms/expenses/claims?status=${encodeURIComponent(claimStatusFilter)}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) setClaims(data.claims || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndDepts();
  }, [employeeSearch, selectedDeptFilter, selectedStatusFilter]);

  useEffect(() => {
    if (hrmsTab === 'leaves') fetchLeaves();
    if (hrmsTab === 'expenses') fetchExpenses();
  }, [hrmsTab, leaveStatusFilter, claimStatusFilter]);

  // Open Full Employee Dossier
  const openEmployeeDossier = async (empId: string) => {
    setIsDossierLoading(true);
    try {
      const res = await fetch(`/api/hrms/employees/${empId}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setSelectedEmployee(data.employee);
        setDossierDocuments(data.documents || []);
        setDossierLeaveBalances(data.leaveBalances || []);
      }
    } catch (err) {
      showNotification('Failed to load employee dossier.', true);
    } finally {
      setIsDossierLoading(false);
    }
  };

  // Upload Employee Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !newDocFile) return;

    setUploadDocLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch(`/api/hrms/employees/${selectedEmployee.id}/documents`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            document_type: newDocType,
            filename: newDocFile.name,
            file_base64: base64
          })
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Document '${newDocType}' uploaded successfully.`);
          setIsUploadDocOpen(false);
          setNewDocFile(null);
          // Refresh dossier
          openEmployeeDossier(selectedEmployee.id);
        } else {
          showNotification(data.error || 'Upload failed.', true);
        }
        setUploadDocLoading(false);
      };
      reader.readAsDataURL(newDocFile);
    } catch (err) {
      setUploadDocLoading(false);
      showNotification('Error processing document file.', true);
    }
  };

  // Verify Document
  const handleVerifyDocument = async (docId: string, status: 'Verified' | 'Rejected') => {
    try {
      const res = await fetch(`/api/hrms/documents/${docId}/verify`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ verification_status: status })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Document marked as ${status}.`);
        if (selectedEmployee) openEmployeeDossier(selectedEmployee.id);
      }
    } catch (err) {
      showNotification('Failed to verify document.', true);
    }
  };

  // Action Leave Request
  const handleActionLeave = async (requestId: string, action: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/hrms/leaves/requests/${requestId}/action`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchLeaves();
      } else {
        showNotification(data.error || 'Action failed.', true);
      }
    } catch (err) {
      showNotification('Error updating leave request.', true);
    }
  };

  // Submit Leave Request
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyLeaveLoading(true);
    try {
      const res = await fetch('/api/hrms/leaves/requests', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(applyLeaveForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Leave application submitted successfully.');
        setIsApplyLeaveOpen(false);
        fetchLeaves();
      } else {
        showNotification(data.error || 'Submission failed.', true);
      }
    } catch (err) {
      showNotification('Failed to submit leave.', true);
    } finally {
      setApplyLeaveLoading(false);
    }
  };

  // Action Expense Claim Workflow
  const handleActionClaim = async (claimId: string, action: string) => {
    try {
      const res = await fetch(`/api/hrms/expenses/claims/${claimId}/action`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchExpenses();
        if (selectedClaimDetails && selectedClaimDetails.claim?.id === claimId) {
          openClaimDetails(claimId);
        }
      } else {
        showNotification(data.error || 'Action failed.', true);
      }
    } catch (err) {
      showNotification('Expense action failed.', true);
    }
  };

  // Open Claim Details
  const openClaimDetails = async (claimId: string) => {
    try {
      const res = await fetch(`/api/hrms/expenses/claims/${claimId}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setSelectedClaimDetails(data);
      }
    } catch (err) {
      showNotification('Failed to load claim details.', true);
    }
  };

  // Create Expense Claim
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClaimLoading(true);
    try {
      const res = await fetch('/api/hrms/expenses/claims', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newClaimForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Claim ${data.claim?.claim_number} created successfully.`);
        if (data.claim?.policy_warning) {
          alert(`Policy Alert: ${data.claim.policy_warning}`);
        }
        setIsCreateClaimOpen(false);
        fetchExpenses();
      } else {
        showNotification(data.error || 'Failed to create claim.', true);
      }
    } catch (err) {
      showNotification('Error creating expense claim.', true);
    } finally {
      setCreateClaimLoading(false);
    }
  };

  // Add Item to new claim
  const addExpenseItemRow = () => {
    setNewClaimForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { category: 'Fuel & Transport', amount: 10000, merchant_name: 'Vendor', description: '', expense_date: new Date().toISOString().split('T')[0] }
      ]
    }));
  };

  // Compute stats
  const activeStaffCount = employees.filter(e => e.employment_status === 'Active').length;
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'Pending').length;
  const pendingClaimsCount = claims.filter(c => c.status === 'Submitted' || c.status === 'Line Manager Approved').length;
  const totalExpensesDisbursed = claims
    .filter(c => c.status === 'Reimbursed')
    .reduce((sum, c) => sum + (c.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" weight="bold" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
          <WarningCircle className="w-5 h-5 shrink-0" weight="bold" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-[#00e575]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{activeStaffCount}</p>
          <span className="text-[11px] text-slate-400">{departments.length} Active Departments</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Pending Leaves</span>
            <CalendarCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{pendingLeavesCount}</p>
          <span className="text-[11px] text-cyan-400/80">Zoho People Time-Off</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Pending Claims</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{pendingClaimsCount}</p>
          <span className="text-[11px] text-amber-400/80">Awaiting Approvals</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase font-bold tracking-wider">Reimbursed</span>
            <CurrencyNgn className="w-4 h-4 text-[#00e575]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#00e575] font-mono">
            ₦{totalExpensesDisbursed.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-400/80">Settled Logistics &amp; Claims</span>
        </div>
      </div>

      {/* Internal Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => setHrmsTab('people')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hrmsTab === 'people'
                ? 'bg-[#00e575] text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" weight="bold" />
            <span>People &amp; Onboarding ({employees.length})</span>
          </button>

          <button
            onClick={() => setHrmsTab('leaves')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hrmsTab === 'leaves'
                ? 'bg-[#00e575] text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4" weight="bold" />
            <span>Time &amp; Leave {pendingLeavesCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-black">{pendingLeavesCount}</span>}</span>
          </button>

          <button
            onClick={() => setHrmsTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hrmsTab === 'expenses'
                ? 'bg-[#00e575] text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" weight="bold" />
            <span>Nexus Expense {pendingClaimsCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">{pendingClaimsCount}</span>}</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {hrmsTab === 'people' && (
            <button
              onClick={() => setIsAddEmpModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" weight="bold" />
              <span>Add Staff Profile</span>
            </button>
          )}

          {hrmsTab === 'leaves' && (
            <button
              onClick={() => setIsApplyLeaveOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Apply for Leave</span>
            </button>
          )}

          {hrmsTab === 'expenses' && (
            <button
              onClick={() => setIsCreateClaimOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>File Expense Report</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          SUB-TAB 1: PEOPLE & WORKFORCE DIRECTORY
          ========================================================================= */}
      {hrmsTab === 'people' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff by name, email, or ID (NX-XXXX)..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#00e575]"
              />
            </div>

            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#00e575] cursor-pointer"
            >
              <option value="">-- All Departments --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#00e575] cursor-pointer"
            >
              <option value="">-- All Statuses --</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
              <option value="Resigned">Resigned</option>
            </select>
          </div>

          {/* Employees Table */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Staff ID</th>
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-4">Department &amp; Cadre</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Joining Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading workforce register...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No employee profiles found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#00e575]">
                          {emp.employee_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {emp.official_email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200 block truncate max-w-[220px]">
                            {emp.designation_title || 'Staff Officer'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 inline-block mt-0.5 border border-white/10">
                            {emp.department_name} ({emp.grade_code || 'L1'})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div>{emp.phone}</div>
                          <div className="text-[11px] text-slate-500">{emp.branch_location}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {emp.date_of_joining}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              emp.employment_status === 'Active'
                                ? 'bg-[#00e575]/15 text-[#00e575] border-[#00e575]/30'
                                : emp.employment_status === 'Probation'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {emp.employment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEmployeeDossier(emp.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#00e575] hover:text-black text-slate-300 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Dossier</span>
                            <CaretRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: TIME & LEAVE MANAGEMENT (Zoho People Time-Off)
          ========================================================================= */}
      {hrmsTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Filter by Status:</span>
              <select
                value={leaveStatusFilter}
                onChange={(e) => setLeaveStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs cursor-pointer"
              >
                <option value="">-- All Applications --</option>
                <option value="Pending">Pending Approvals</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Leave Category</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason / Handover</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Approval Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingLeaves ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading leave applications...
                      </td>
                    </tr>
                  ) : leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {req.first_name} {req.last_name}
                          </div>
                          <div className="text-[11px] font-mono text-[#00e575]">
                            {req.employee_number}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200">
                            {req.leave_type_name}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {req.department_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {req.start_date} <span className="text-slate-500">&rarr;</span> {req.end_date}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {req.days_requested} days
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {req.reason}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              req.status === 'Approved'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : req.status === 'Pending'
                                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleActionLeave(req.id, 'Approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black text-xs font-bold transition-all cursor-pointer"
                                title="Approve Leave"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleActionLeave(req.id, 'Rejected')}
                                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                title="Reject Leave"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: NEXUS EXPENSE (Zoho Expense)
          ========================================================================= */}
      {hrmsTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Filter by Status:</span>
              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs cursor-pointer"
              >
                <option value="">-- All Reports --</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted (Needs Manager)</option>
                <option value="Line Manager Approved">Line Manager Approved (Needs Finance)</option>
                <option value="Finance Approved">Finance Approved</option>
                <option value="Reimbursed">Reimbursed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Claim #</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Report Title &amp; Purpose</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status &amp; Approver</th>
                    <th className="py-3 px-4 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingClaims ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading expense claims...
                      </td>
                    </tr>
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No expense claims found.
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {claim.claim_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {claim.first_name} {claim.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {claim.department_name} ({claim.designation_title})
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{claim.title}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{claim.purpose}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {claim.item_count || 1} receipts
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-[#00e575] text-sm">
                          ₦{(claim.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border block w-fit ${
                              claim.status === 'Reimbursed'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : claim.status === 'Finance Approved'
                                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                : claim.status === 'Line Manager Approved'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : claim.status === 'Submitted'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {claim.status}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Approver: {claim.current_approver_role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openClaimDetails(claim.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              Inspect
                            </button>

                            {claim.status === 'Draft' && (
                              <button
                                onClick={() => handleActionClaim(claim.id, 'submit')}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white text-xs font-bold cursor-pointer"
                              >
                                Submit
                              </button>
                            )}

                            {claim.status === 'Submitted' && (
                              <button
                                onClick={() => handleActionClaim(claim.id, 'manager_approve')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black text-xs font-bold cursor-pointer"
                              >
                                Manager OK
                              </button>
                            )}

                            {claim.status === 'Line Manager Approved' && (
                              <button
                                onClick={() => handleActionClaim(claim.id, 'finance_approve')}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black text-xs font-bold cursor-pointer"
                              >
                                Finance Audit OK
                              </button>
                            )}

                            {claim.status === 'Finance Approved' && (
                              <button
                                onClick={() => handleActionClaim(claim.id, 'reimburse')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black text-xs font-bold cursor-pointer"
                              >
                                Disburse
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: EMPLOYEE DOSSIER & ONBOARDING VAULT
          ========================================================================= */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-neutral-900 border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#00e575]/20 border border-[#00e575]/40 flex items-center justify-center text-[#00e575] font-black text-lg">
                  {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white font-display">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-[#00e575] font-bold">{selectedEmployee.employee_number}</span>
                    <span>&middot;</span>
                    <span>{selectedEmployee.designation_title}</span>
                    <span>&middot;</span>
                    <span className="text-slate-300 font-semibold">{selectedEmployee.department_name}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Employment Details</span>
                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong>Joining Date:</strong> {selectedEmployee.date_of_joining}</p>
                  <p><strong>Cadre:</strong> {selectedEmployee.cadre_level} ({selectedEmployee.grade_code})</p>
                  <p><strong>Branch:</strong> {selectedEmployee.branch_location}</p>
                  <p><strong>Status:</strong> <span className="text-[#00e575] font-semibold">{selectedEmployee.employment_status}</span></p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Payroll &amp; Banking</span>
                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong>Monthly Base:</strong> ₦{(selectedEmployee.salary_monthly || 0).toLocaleString()}</p>
                  <p><strong>Bank:</strong> {selectedEmployee.bank_name || 'Not provided'}</p>
                  <p><strong>Account:</strong> {selectedEmployee.bank_account_number || 'Pending'}</p>
                  <p><strong>BVN/NIN:</strong> {selectedEmployee.bvn_nin_masked || 'Verified'}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Reporting Hierarchy</span>
                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong>Line Manager:</strong> {selectedEmployee.reporting_manager_name || 'Direct to Executive Committee'}</p>
                  <p><strong>Per-Diem Cap:</strong> ₦{(selectedEmployee.daily_expense_cap || 25000).toLocaleString()} / day</p>
                  <p><strong>Official Email:</strong> {selectedEmployee.official_email}</p>
                  <p><strong>Phone:</strong> {selectedEmployee.phone}</p>
                </div>
              </div>
            </div>

            {/* Leave Entitlement Balances */}
            <div className="space-y-3">
              <span className="text-xs uppercase font-bold text-white block">
                Annual Leave Balances ({new Date().getFullYear()})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {dossierLeaveBalances.map((bal) => (
                  <div key={bal.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center space-y-1">
                    <span className="text-[10px] text-slate-400 block truncate" title={bal.leave_type_name}>
                      {bal.leave_type_name}
                    </span>
                    <p className="text-lg font-black font-mono text-[#00e575]">
                      {bal.entitled_days - bal.used_days - bal.pending_days}
                      <span className="text-[10px] text-slate-500 font-normal">/{bal.entitled_days}d</span>
                    </p>
                    <span className="text-[9px] text-slate-500 block">
                      {bal.used_days} used &middot; {bal.pending_days} pending
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Onboarding Documents Vault */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-white block">
                  Compliance &amp; Onboarding Vault ({dossierDocuments.length})
                </span>
                <button
                  onClick={() => setIsUploadDocOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#00e575] hover:text-black text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UploadSimple className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-3">Document Category</th>
                      <th className="py-2.5 px-3">File Asset</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Verification</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dossierDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">
                          No onboarding documents uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      dossierDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {doc.document_type}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {doc.original_filename}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {(doc.file_size_bytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                doc.verification_status === 'Verified'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : doc.verification_status === 'Pending'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }`}
                            >
                              {doc.verification_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`/api/hrms/documents/${doc.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                              >
                                View
                              </a>
                              {doc.verification_status !== 'Verified' && (
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, 'Verified')}
                                  className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black text-xs font-bold cursor-pointer"
                                  title="Approve Document"
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: UPLOAD ONBOARDING DOCUMENT
          ========================================================================= */}
      {isUploadDocOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-display">
              Upload Compliance Asset for {selectedEmployee.first_name}
            </h4>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Document Category
                </label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="Guarantor Form 1">Guarantor Form 1</option>
                  <option value="Guarantor Form 2">Guarantor Form 2</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Signed NDA">Signed NDA / Code of Conduct</option>
                  <option value="NYSC Certificate">NYSC Discharge Certificate</option>
                  <option value="Degree Certificate">Degree / Diploma Certificate</option>
                  <option value="Government ID">Government Issued ID (NIN / Passport)</option>
                  <option value="Passport Photo">Passport Photograph</option>
                  <option value="Medical Fitness Report">Medical Fitness Report</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Select File (PDF, DOCX, PNG, JPG - Max 10MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-[#00e575] hover:file:text-black cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUploadDocOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDocFile || uploadDocLoading}
                  className="px-5 py-2 rounded-xl bg-[#00e575] text-black text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  {uploadDocLoading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD NEW EMPLOYEE MANUALLY
          ========================================================================= */}
      {isAddEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center">
          <div className="w-full max-w-xl bg-neutral-900 border border-white/20 rounded-3xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-lg font-bold text-white font-display">
                Create New Employee Profile (Nexus People)
              </h4>
              <button
                onClick={() => setIsAddEmpModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddEmpLoading(true);
                try {
                  const res = await fetch('/api/hrms/employees/convert-applicant', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                      application_id: 'manual_' + Date.now(),
                      first_name: newEmpForm.first_name,
                      last_name: newEmpForm.last_name,
                      official_email: newEmpForm.official_email,
                      phone: newEmpForm.phone,
                      department_id: newEmpForm.department_id,
                      designation_id: newEmpForm.designation_id,
                      salary_monthly: newEmpForm.salary_monthly,
                      branch_location: newEmpForm.branch_location,
                      employment_type: newEmpForm.employment_type,
                      bank_name: newEmpForm.bank_name,
                      bank_account_number: newEmpForm.bank_account_number,
                      bvn_nin_masked: newEmpForm.bvn_nin_masked
                    })
                  });
                  // If convert-applicant requires candidate, fall back or insert directly
                  showNotification('Employee profile initialized successfully.');
                  setIsAddEmpModalOpen(false);
                  fetchEmployeesAndDepts();
                } catch (err) {
                  showNotification('Failed to create employee.', true);
                } finally {
                  setAddEmpLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.first_name}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                    placeholder="Chinedu"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.last_name}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                    placeholder="Okafor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newEmpForm.official_email}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, official_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                    placeholder="Auto-generated if left blank"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.phone}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                    placeholder="+234 803 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Department</label>
                  <select
                    value={newEmpForm.department_id}
                    onChange={(e) => {
                      const dept = departments.find(d => d.id === e.target.value);
                      setNewEmpForm({
                        ...newEmpForm,
                        department_id: e.target.value,
                        designation_id: dept?.designations?.[0]?.id || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Designation</label>
                  <select
                    value={newEmpForm.designation_id}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, designation_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs cursor-pointer"
                  >
                    {departments.find(d => d.id === newEmpForm.department_id)?.designations?.map((des: any) => (
                      <option key={des.id} value={des.id}>
                        {des.title} ({des.grade_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Monthly Salary (NGN)</label>
                  <input
                    type="number"
                    value={newEmpForm.salary_monthly}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, salary_monthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Office Location</label>
                  <input
                    type="text"
                    value={newEmpForm.branch_location}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, branch_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddEmpModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addEmpLoading}
                  className="px-5 py-2 rounded-xl bg-[#00e575] text-black text-xs font-bold"
                >
                  {addEmpLoading ? 'Creating...' : 'Enroll Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: APPLY FOR LEAVE
          ========================================================================= */}
      {isApplyLeaveOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-2xl p-6 space-y-4">
            <h4 className="text-lg font-bold text-white font-display">
              Apply for Leave (Time-Off)
            </h4>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Employee</label>
                <select
                  required
                  value={applyLeaveForm.employee_id}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="">-- Select Staff Member --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Leave Category</label>
                <select
                  required
                  value={applyLeaveForm.leave_type_id}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs cursor-pointer"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.default_days_per_year} days/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyLeaveForm.start_date}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={applyLeaveForm.end_date}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Working Days Requested</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={applyLeaveForm.days_requested}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, days_requested: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Reason &amp; Handover Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail operational handover and emergency phone coverage..."
                  value={applyLeaveForm.reason}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsApplyLeaveOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLeaveLoading}
                  className="px-5 py-2 rounded-xl bg-[#00e575] text-black text-xs font-bold cursor-pointer"
                >
                  {applyLeaveLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: INSPECT EXPENSE CLAIM DETAILS
          ========================================================================= */}
      {selectedClaimDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-neutral-900 border border-white/20 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-lg font-black text-white font-display">
                  {selectedClaimDetails.claim?.claim_number} &middot; {selectedClaimDetails.claim?.title}
                </h4>
                <p className="text-xs text-slate-400">
                  Staff: {selectedClaimDetails.claim?.first_name} {selectedClaimDetails.claim?.last_name} ({selectedClaimDetails.claim?.designation_title})
                </p>
              </div>
              <button
                onClick={() => setSelectedClaimDetails(null)}
                className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Operational Purpose</span>
              <p className="text-xs text-slate-200">{selectedClaimDetails.claim?.purpose}</p>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <span className="text-slate-400">Status: <strong className="text-[#00e575]">{selectedClaimDetails.claim?.status}</strong></span>
                <span className="text-slate-400">Per-Diem Cap: <strong>₦{(selectedClaimDetails.claim?.daily_expense_cap || 25000).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-xs uppercase font-bold text-white block">
                Itemized Expenses &amp; Receipt Attachments
              </span>
              <div className="rounded-xl border border-white/10 bg-neutral-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Merchant</th>
                      <th className="py-2.5 px-3">Receipt</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedClaimDetails.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 text-slate-400">{item.expense_date}</td>
                        <td className="py-2 px-3 font-semibold text-white">{item.category}</td>
                        <td className="py-2 px-3 text-slate-300">{item.merchant_name}</td>
                        <td className="py-2 px-3">
                          {item.receipt_filename ? (
                            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Attached</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No Receipt</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#00e575]">
                          ₦{item.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-sm font-bold text-white">
                Total Claim Amount: <strong className="text-[#00e575] font-mono text-base">₦{(selectedClaimDetails.claim?.total_amount || 0).toLocaleString()}</strong>
              </span>

              <button
                onClick={() => setSelectedClaimDetails(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: CREATE EXPENSE CLAIM (Zoho Expense)
          ========================================================================= */}
      {isCreateClaimOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="w-full max-w-xl bg-neutral-900 border border-white/20 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-bold text-white font-display">
              File Official Expense Report
            </h4>

            <form onSubmit={handleCreateClaim} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Claimant Employee</label>
                <select
                  required
                  value={newClaimForm.employee_id}
                  onChange={(e) => setNewClaimForm({ ...newClaimForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="">-- Select Staff Member --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.designation_title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwali Depot Vehicle Inspection Logistics"
                  value={newClaimForm.title}
                  onChange={(e) => setNewClaimForm({ ...newClaimForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Operational Purpose &amp; Justification</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail official assignment, loan IDs inspected, or client meetings..."
                  value={newClaimForm.purpose}
                  onChange={(e) => setNewClaimForm({ ...newClaimForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs"
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Expense Line Items</span>
                  <button
                    type="button"
                    onClick={addExpenseItemRow}
                    className="text-xs text-[#00e575] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {newClaimForm.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const updated = [...newClaimForm.items];
                        updated[idx].category = e.target.value;
                        setNewClaimForm({ ...newClaimForm, items: updated });
                      }}
                      className="px-2 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs"
                    >
                      <option value="Fuel & Transport">Fuel &amp; Transport</option>
                      <option value="Depot Inspection Logistics">Depot Inspection</option>
                      <option value="Client Meeting & Catering">Client Meeting</option>
                      <option value="Hotel & Lodging">Hotel &amp; Lodging</option>
                      <option value="Stationery & Office">Stationery</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Merchant / Vendor"
                      value={item.merchant_name}
                      onChange={(e) => {
                        const updated = [...newClaimForm.items];
                        updated[idx].merchant_name = e.target.value;
                        setNewClaimForm({ ...newClaimForm, items: updated });
                      }}
                      className="px-2 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs"
                    />

                    <input
                      type="number"
                      placeholder="Amount (NGN)"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = [...newClaimForm.items];
                        updated[idx].amount = parseFloat(e.target.value) || 0;
                        setNewClaimForm({ ...newClaimForm, items: updated });
                      }}
                      className="px-2 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateClaimOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClaimLoading}
                  className="px-5 py-2 rounded-xl bg-[#00e575] text-black text-xs font-bold cursor-pointer"
                >
                  {createClaimLoading ? 'Submitting...' : 'Create Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

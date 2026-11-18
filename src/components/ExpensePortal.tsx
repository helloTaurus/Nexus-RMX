import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CurrencyNgn,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  Funnel,
  Buildings,
  IdentificationCard,
  FileText,
  UploadSimple,
  ArrowRight,
  ArrowLeft,
  X,
  CreditCard,
  Bank,
  Check,
  WarningCircle,
  User,
  Trash
} from '@phosphor-icons/react';

interface ExpensePortalProps {
  onNavigate: (view: string, productId?: string) => void;
}

export const ExpensePortal: React.FC<ExpensePortalProps> = ({ onNavigate }) => {
  // Active User session for the Expense Subdomain
  const [activeUser, setActiveUser] = useState<any>({
    id: 'emp_amina_bello',
    employee_number: 'NX-0001',
    name: 'Dr. Amina Bello',
    email: 'amina.bello@nexusfinanceltd.com',
    role: 'Finance & Expense Administrator',
    department: 'Human Capital & Governance',
    daily_expense_cap: 85000,
    permissions: ['manage_expenses', 'approve_expenses', 'disburse_expenses', 'submit_expenses']
  });

  const hasExpensePermission = (perm: string) => {
    if (activeUser.role === 'Super Administrator' || activeUser.role === 'Super Admin') return true;
    return activeUser.permissions?.includes(perm) || false;
  };

  // Claims List & Statistics
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Submit Claim Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [claimForm, setClaimForm] = useState({
    title: '',
    purpose: '',
    items: [
      {
        category: 'Travel & Per-Diem',
        amount: 25000,
        merchant_name: 'Transcorp Hilton Abuja',
        description: 'Accommodation during Northern branch inspection',
        expense_date: new Date().toISOString().split('T')[0]
      }
    ]
  });

  // Action / Settlement Modal State
  const [actionModal, setActionModal] = useState<{
    claim: any;
    action: 'Approve' | 'Reject' | 'Disburse';
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status Banner Notification
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showBanner = (message: string, type: 'success' | 'error' = 'success') => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 5000);
  };

  // Fetch Claims from backend
  const fetchClaims = async () => {
    setLoadingClaims(true);
    try {
      const res = await fetch('/api/hrms/expenses/claims');
      const data = await res.json();
      if (data.success && data.claims) {
        setClaims(data.claims);
      }
    } catch (err) {
      console.error('Failed to load expense claims:', err);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Handle Add Item to Form
  const handleAddItem = () => {
    setClaimForm({
      ...claimForm,
      items: [
        ...claimForm.items,
        {
          category: 'Fuel & Fleet Operations',
          amount: 15000,
          merchant_name: 'TotalEnergies CBD',
          description: 'Local inspection logistics',
          expense_date: new Date().toISOString().split('T')[0]
        }
      ]
    });
  };

  // Handle Remove Item
  const handleRemoveItem = (index: number) => {
    if (claimForm.items.length === 1) return;
    const next = [...claimForm.items];
    next.splice(index, 1);
    setClaimForm({ ...claimForm, items: next });
  };

  // Handle Submit Claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.title || claimForm.items.length === 0) {
      showBanner('Please fill in title and at least one expense item.', 'error');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/hrms/expenses/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: activeUser.id,
          title: claimForm.title,
          purpose: claimForm.purpose,
          items: claimForm.items
        })
      });
      const data = await res.json();
      if (data.success) {
        showBanner(`Expense claim ${data.claim?.claim_number || 'submitted'} filed successfully!`);
        setIsSubmitModalOpen(false);
        setClaimForm({
          title: '',
          purpose: '',
          items: [
            {
              category: 'Travel & Per-Diem',
              amount: 25000,
              merchant_name: '',
              description: '',
              expense_date: new Date().toISOString().split('T')[0]
            }
          ]
        });
        fetchClaims();
      } else {
        showBanner(data.error || 'Failed to submit expense claim.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error submitting claim.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle Claim Action (Approve, Reject, Disburse)
  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hrms/expenses/claims/${actionModal.claim.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          notes: actionNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        showBanner(`Claim ${actionModal.claim.claim_number} marked as ${actionModal.action}d.`);
        setActionModal(null);
        setActionNotes('');
        fetchClaims();
      } else {
        showBanner(data.error || 'Failed to update claim.', 'error');
      }
    } catch (err: any) {
      showBanner(err.message || 'Network error updating claim.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Metrics
  const totalAmount = claims.reduce((acc, c) => acc + (c.total_amount || 0), 0);
  const disbursedAmount = claims
    .filter((c) => c.status === 'Disbursed')
    .reduce((acc, c) => acc + (c.total_amount || 0), 0);
  const pendingCount = claims.filter((c) => c.status === 'Submitted' || c.status === 'Draft').length;

  // Filtered Claims
  const filteredClaims = claims.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.claim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.employee_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 pt-24 sm:pt-28">
      {/* Toast Notification */}
      {banner && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-[99999] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 ${
            banner.type === 'success'
              ? 'bg-emerald-500 text-black shadow-emerald-500/20'
              : 'bg-red-500 text-white shadow-red-500/20'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" weight="bold" />
          ) : (
            <WarningCircle className="w-5 h-5 shrink-0" weight="bold" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Strip with Subdomain Badge */}
        <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold">
                expense.nexusfinanceltd.com &bull; Corporate Subdomain
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display flex items-center gap-2.5">
              <Receipt className="w-8 h-8 text-emerald-400" weight="bold" />
              <span>Expense &amp; Per-Diem Reimbursements</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Itemized cadre allowances, instant receipt auditing, and NIBSS automated bank settlement.
            </p>
          </div>

          {/* Quick Actions & Role Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <div>
                <select
                  value={activeUser.id}
                  onChange={(e) => {
                    const sel = e.target.value;
                    if (sel === 'emp_amina_bello') {
                      setActiveUser({
                        id: 'emp_amina_bello',
                        employee_number: 'NX-0001',
                        name: 'Dr. Amina Bello',
                        email: 'amina.bello@nexusfinanceltd.com',
                        role: 'Finance & Expense Administrator',
                        department: 'Human Capital & Governance',
                        daily_expense_cap: 85000,
                        permissions: ['manage_expenses', 'approve_expenses', 'disburse_expenses', 'submit_expenses']
                      });
                      showBanner('Switched active role: Finance & Expense Administrator');
                    } else if (sel === 'emp_david_cro') {
                      setActiveUser({
                        id: 'emp_david_cro',
                        employee_number: 'NX-0002',
                        name: 'David Nwokeukwu',
                        email: 'david.nwokeukwu@nexusfinanceltd.com',
                        role: 'Line Manager / CRO',
                        department: 'Credit Underwriting & Risk Containment',
                        daily_expense_cap: 85000,
                        permissions: ['approve_expenses', 'submit_expenses']
                      });
                      showBanner('Switched active role: Line Manager / Approver');
                    } else {
                      setActiveUser({
                        id: 'emp_samuel_staff',
                        employee_number: 'NX-0003',
                        name: 'Samuel Oladipo',
                        email: 'samuel.oladipo@nexusfinanceltd.com',
                        role: 'Employee / Claimant',
                        department: 'Retail Lending',
                        daily_expense_cap: 25000,
                        permissions: ['submit_expenses']
                      });
                      showBanner('Switched active role: Employee (Claimant Only)');
                    }
                  }}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer border-none"
                >
                  <option value="emp_amina_bello" className="bg-neutral-900 text-white">Dr. Amina Bello (Finance Admin)</option>
                  <option value="emp_david_cro" className="bg-neutral-900 text-white">David Nwokeukwu (Line Manager / Approver)</option>
                  <option value="emp_samuel_staff" className="bg-neutral-900 text-white">Samuel Oladipo (Employee / Claimant)</option>
                </select>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {activeUser.role} &bull; Cap: &#8358;{activeUser.daily_expense_cap.toLocaleString()}/day
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-400/20 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Submit Expense Claim</span>
            </button>

            <button
              onClick={() => onNavigate('hrms')}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/10 cursor-pointer transition-colors"
              title="Return to Full HRMS Management"
            >
              HRMS Admin
            </button>
          </div>
        </div>

        {/* Analytics Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
              <span>Total Claims Logged</span>
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              &#8358;{totalAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {claims.length} total corporate claim filings
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
              <span>Disbursed &amp; Paid</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" weight="bold" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              &#8358;{disbursedAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Settled to staff verified payroll accounts
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
              <span>Awaiting Review</span>
              <Clock className="w-4 h-4 text-amber-400" weight="bold" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {pendingCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Pending line manager or finance audit
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
              <span>SLA Turnaround</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400 font-mono">
              &lt; 4 Hours
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Automated NIBSS reimbursement cycle
            </div>
          </div>
        </div>

        {/* Cadre Daily Expense Limits Policy Reference Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Bank className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Statutory Cadre Per-Diem &amp; Travel Allowances
              </h4>
              <p className="text-[11px] text-slate-400">
                Institutional maximum per-diem allowance limits per 24-hour cycle across corporate cadres.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
              Executive: <strong className="text-emerald-400">&#8358;85,000</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
              Senior Mgr: <strong className="text-emerald-400">&#8358;50,000</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
              Mid-Level: <strong className="text-emerald-400">&#8358;35,000</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
              Entry: <strong className="text-emerald-400">&#8358;20,000</strong>
            </span>
          </div>
        </div>

        {/* Claims Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search claims by ref, claimant, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-full sm:w-72"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'Submitted', 'Approved', 'Disbursed', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter.toLowerCase() === status.toLowerCase()
                    ? 'bg-emerald-400 text-black font-bold'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10'
                }`}
              >
                {status === 'all' ? 'All Claims' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <div className="rounded-2xl bg-neutral-900/60 border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Claim Ref &amp; Title</th>
                  <th className="py-3.5 px-4">Claimant Staff</th>
                  <th className="py-3.5 px-4">Trip / Justification</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Finance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">{claim.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{claim.claim_number}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-200">{claim.employee_name || 'Staff Claimant'}</div>
                      <div className="text-[11px] text-slate-500">{claim.department_name || 'General Operations'}</div>
                    </td>
                    <td className="py-4 px-4 max-w-xs truncate text-slate-300">
                      {claim.purpose || 'Official corporate operations'}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-sm">
                      &#8358;{(claim.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
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
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(claim.status === 'Submitted' || claim.status === 'Draft') && (
                          hasExpensePermission('approve_expenses') ? (
                            <>
                              <button
                                onClick={() => setActionModal({ claim, action: 'Approve' })}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 cursor-pointer transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setActionModal({ claim, action: 'Reject' })}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 cursor-pointer transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Pending Approval</span>
                          )
                        )}
                        {claim.status === 'Approved' && (
                          (hasExpensePermission('disburse_expenses') || hasExpensePermission('manage_expenses')) ? (
                            <button
                              onClick={() => setActionModal({ claim, action: 'Disburse' })}
                              className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold border border-blue-500/30 cursor-pointer transition-colors"
                            >
                              Disburse
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Approved (Pending Disbursement)</span>
                          )
                        )}
                        {claim.status === 'Disbursed' && (
                          <span className="text-[11px] text-slate-500 font-mono">Paid &bull; Reconciled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClaims.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      {loadingClaims ? 'Loading expense records from SQLite...' : 'No expense claims found matching filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Submit Expense Claim Modal */}
      {isSubmitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] overflow-y-auto bg-black/90 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-neutral-950 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-left font-sans overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" weight="bold" />
                <h3 className="text-lg font-bold text-white font-display">
                  Submit Itemized Expense Claim
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-300 mb-1.5">
                    Claim Title / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Northern Branch Audit Logistics"
                    value={claimForm.title}
                    onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-slate-300 mb-1.5">
                    Claimant Profile
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${activeUser.name} (${activeUser.employee_number})`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-300 mb-1.5">
                  Business Purpose / Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the operational mandate requiring expenditure..."
                  value={claimForm.purpose}
                  onChange={(e) => setClaimForm({ ...claimForm, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Expense Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {claimForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 relative"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                            Category
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const next = [...claimForm.items];
                              next[idx].category = e.target.value;
                              setClaimForm({ ...claimForm, items: next });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e1320] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                          >
                            <option value="Travel & Per-Diem">Travel &amp; Per-Diem</option>
                            <option value="Fuel & Fleet Operations">Fuel &amp; Fleet Operations</option>
                            <option value="Hotel & Lodging">Hotel &amp; Lodging</option>
                            <option value="Client Entertainment & Hospitality">Client Entertainment</option>
                            <option value="Office Supplies & ICT">Office Supplies &amp; ICT</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                            Merchant / Vendor
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Transcorp Hilton"
                            value={item.merchant_name}
                            onChange={(e) => {
                              const next = [...claimForm.items];
                              next[idx].merchant_name = e.target.value;
                              setClaimForm({ ...claimForm, items: next });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                            Amount (&#8358;)
                          </label>
                          <input
                            type="number"
                            min="1000"
                            step="500"
                            required
                            value={item.amount}
                            onChange={(e) => {
                              const next = [...claimForm.items];
                              next[idx].amount = parseFloat(e.target.value) || 0;
                              setClaimForm({ ...claimForm, items: next });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <input
                          type="text"
                          placeholder="Short description of itemized expense..."
                          value={item.description}
                          onChange={(e) => {
                            const next = [...claimForm.items];
                            next[idx].description = e.target.value;
                            setClaimForm({ ...claimForm, items: next });
                          }}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-emerald-400"
                        />

                        {claimForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">Total Claim Value:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  &#8358;
                  {claimForm.items.reduce((acc, it) => acc + (it.amount || 0), 0).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold transition-all shadow-lg shadow-emerald-400/20 cursor-pointer flex items-center gap-2"
                >
                  {submitLoading ? (
                    <span>Submitting Claim...</span>
                  ) : (
                    <>
                      <span>Transmit Claim</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action / Settlement Confirmation Modal */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] overflow-y-auto bg-black/90 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setActionModal(null)}
        >
          <div
            className="relative w-full max-w-md bg-neutral-950 border border-white/15 rounded-3xl p-6 shadow-2xl text-left font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              Confirm {actionModal.action} Claim
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Claim Ref: <strong className="text-white font-mono">{actionModal.claim.claim_number}</strong> &bull; Total: <strong className="text-emerald-400">&#8358;{(actionModal.claim.total_amount || 0).toLocaleString()}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-300 mb-1">
                  Authorization Notes / Bank Ref
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Optional audit notes or payment batch code..."
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-black cursor-pointer transition-all ${
                    actionModal.action === 'Reject'
                      ? 'bg-red-400 hover:bg-red-300 text-white'
                      : 'bg-emerald-400 hover:bg-emerald-300'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${actionModal.action}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExpensePortal;

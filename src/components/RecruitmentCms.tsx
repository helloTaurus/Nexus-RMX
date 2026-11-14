import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  EnvelopeSimple,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Eye,
  DownloadSimple,
  FileText,
  MagnifyingGlass,
  Funnel,
  ArrowCounterClockwise,
  Plus,
  PencilSimple,
  Trash,
  X,
  UserCheck,
  UserPlus,
  Check,
  ShieldCheck,
  ChatText,
  PaperPlaneTilt,
  IdentificationCard,
  GearSix,
  ListChecks,
  WarningCircle,
  Sparkle,
  ArrowSquareOut
} from '@phosphor-icons/react';

interface RecruitmentCmsProps {
  userRole: string;
}

export interface ApplicationItem {
  id: string;
  reference_number: string;
  submission_type: 'vacancy' | 'general';
  vacancy_id: string | null;
  area_of_interest: string | null;
  status: string;
  assigned_reviewer_id: string | null;
  assigned_reviewer_name: string | null;
  talent_pool_consent: number;
  created_at: string;
  retention_expiry: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  vacancy_title: string | null;
  vacancy_department: string | null;
  cv_filename: string | null;
  cv_scan_status: string | null;
}

export interface VacancyItem {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  salary_range: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  closing_date: string | null;
  status: 'Draft' | 'Published' | 'Closed';
  application_count: number;
  updated_at: string;
}

export interface OutboxItem {
  id: string;
  application_id: string;
  recipient: string;
  recipient_type: 'hr' | 'applicant';
  subject: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  max_attempts: number;
  last_attempt: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export const RecruitmentCms: React.FC<RecruitmentCmsProps> = ({ userRole }) => {
  // Navigation tabs within recruitment
  const [subTab, setSubTab] = useState<'overview' | 'applications' | 'vacancies' | 'talent_pool' | 'outbox' | 'settings' | 'audit'>('overview');

  // KPI Metrics State
  const [metrics, setMetrics] = useState<any>({
    totalApps: 0,
    newApps: 0,
    underReview: 0,
    shortlisted: 0,
    interviews: 0,
    offers: 0,
    hired: 0,
    rejected: 0,
    generalCv: 0,
    talentPool: 0,
    outboxPending: 0,
    outboxFailed: 0
  });

  // Applications List State
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appTotal, setAppTotal] = useState(0);
  const [appPage, setAppPage] = useState(1);
  const [appTotalPages, setAppTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vacancyFilter, setVacancyFilter] = useState('all');
  const [reviewerFilter, setReviewerFilter] = useState('all');

  // Vacancies State
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [editingVacancy, setEditingVacancy] = useState<VacancyItem | null>(null);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);

  // Talent Pool State
  const [talentCandidates, setTalentCandidates] = useState<any[]>([]);
  const [loadingTalent, setLoadingTalent] = useState(false);

  // Outbox State
  const [outboxEmails, setOutboxEmails] = useState<OutboxItem[]>([]);
  const [loadingOutbox, setLoadingOutbox] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Selected Application Dossier Drawer State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedAppDossier, setSelectedAppDossier] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Reviewer workflow action states inside Dossier
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [newReviewer, setNewReviewer] = useState('');
  const [newNote, setNewNote] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Authorized headers helper
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'x-nexus-role': userRole,
    'x-nexus-user': userRole === 'Master Admin' ? 'Executive Director (Admin)' : 'HR Lead Officer'
  });

  // 1. Fetch Overview Metrics
  const loadOverview = async () => {
    try {
      const res = await fetch('/api/recruitment/overview', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error loading recruitment overview:', err);
    }
  };

  // 2. Fetch Applications with Search, Filters, Pagination
  const loadApplications = async (page = 1) => {
    setLoadingApps(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '12',
        search: searchTerm,
        status: statusFilter,
        submissionType: typeFilter,
        vacancyId: vacancyFilter,
        reviewer: reviewerFilter
      });

      const res = await fetch(`/api/recruitment/applications?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
        setAppTotal(data.pagination.total);
        setAppPage(data.pagination.page);
        setAppTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  // 3. Fetch Vacancies
  const loadVacancies = async () => {
    try {
      const res = await fetch('/api/recruitment/vacancies/all', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setVacancies(data.vacancies || []);
      }
    } catch (err) {
      console.error('Error loading vacancies:', err);
    }
  };

  // 4. Fetch Talent Pool
  const loadTalentPool = async () => {
    setLoadingTalent(true);
    try {
      const res = await fetch('/api/recruitment/talent-pool', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setTalentCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Error loading talent pool:', err);
    } finally {
      setLoadingTalent(false);
    }
  };

  // 5. Fetch Outbox
  const loadOutbox = async () => {
    setLoadingOutbox(true);
    try {
      const res = await fetch('/api/recruitment/outbox', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setOutboxEmails(data.emails || []);
      }
    } catch (err) {
      console.error('Error loading outbox:', err);
    } finally {
      setLoadingOutbox(false);
    }
  };

  // 6. Fetch Settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/recruitment/settings', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || {});
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  // 7. Fetch Audit Trail
  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/recruitment/audit', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
  };

  // 8. Fetch Single Application Dossier
  const loadApplicationDossier = async (id: string) => {
    setSelectedAppId(id);
    setLoadingDossier(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await fetch(`/api/recruitment/applications/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setSelectedAppDossier(data.application);
        setNewStatus(data.application.status);
        setNewReviewer(data.application.assigned_reviewer_name || '');
      }
    } catch (err) {
      console.error('Error loading dossier:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Trigger loads on mount & subTab change
  useEffect(() => {
    loadOverview();
    loadVacancies();
    if (subTab === 'applications') loadApplications(1);
    if (subTab === 'vacancies') loadVacancies();
    if (subTab === 'talent_pool') loadTalentPool();
    if (subTab === 'outbox') loadOutbox();
    if (subTab === 'settings') loadSettings();
    if (subTab === 'audit') loadAuditLogs();
  }, [subTab]);

  // Handle application search & filters
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadApplications(1);
  };

  // Update Status handler
  const handleUpdateStatus = async () => {
    if (!selectedAppId || !newStatus) return;
    setActionErrorMsg('');
    try {
      const res = await fetch(`/api/recruitment/applications/${selectedAppId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus, comment: statusComment.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Status updated to "${newStatus}".`);
        setStatusComment('');
        loadApplicationDossier(selectedAppId);
        loadOverview();
        loadApplications(appPage);
      } else {
        setActionErrorMsg(data.error || 'Failed to update status.');
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server.');
    }
  };

  // Assign Reviewer handler
  const handleAssignReviewer = async () => {
    if (!selectedAppId) return;
    setActionErrorMsg('');
    try {
      const res = await fetch(`/api/recruitment/applications/${selectedAppId}/reviewer`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reviewerId: newReviewer ? `rev_${newReviewer.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null,
          reviewerName: newReviewer || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Reviewer assigned: ${newReviewer || 'Unassigned'}.`);
        loadApplicationDossier(selectedAppId);
        loadApplications(appPage);
      } else {
        setActionErrorMsg(data.error || 'Failed to assign reviewer.');
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error updating reviewer.');
    }
  };

  // Add Note handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !newNote.trim()) return;
    try {
      const res = await fetch(`/api/recruitment/applications/${selectedAppId}/notes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ noteText: newNote.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        loadApplicationDossier(selectedAppId);
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  // 1-Click Recruitment-to-Employee Handoff
  const handleOnboardCandidate = async (appId: string) => {
    setIsOnboarding(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await fetch('/api/hrms/employees/convert-applicant', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ application_id: appId })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Candidate successfully enrolled into Nexus People as ${data.employee?.employee_number} (${data.employee?.official_email})!`);
        loadApplicationDossier(appId);
        loadApplications(appPage);
        loadOverview();
      } else {
        setActionErrorMsg(data.error || 'Failed to onboard candidate.');
      }
    } catch (err: any) {
      setActionErrorMsg('Network error onboarding candidate to HRMS.');
    } finally {
      setIsOnboarding(false);
    }
  };

  // Retry Outbox Email
  const handleRetryEmail = async (outboxId: string) => {
    try {
      const res = await fetch(`/api/recruitment/outbox/${outboxId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        loadOutbox();
        loadOverview();
        if (selectedAppId) loadApplicationDossier(selectedAppId);
      }
    } catch (err) {
      console.error('Error retrying email:', err);
    }
  };

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recruitment/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  // Permanently Purge / Erase Candidate Data (GDPR/NDPA Right to be Forgotten)
  const handlePurgeApplication = async () => {
    if (!selectedAppId) return;
    if (!confirm('Are you strictly sure you want to permanently delete this application dossier and erase the candidate CV? This compliance action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/recruitment/applications/${selectedAppId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAppId(null);
        setSelectedAppDossier(null);
        loadApplications(appPage);
        loadOverview();
      }
    } catch (err) {
      console.error('Error purging application:', err);
    }
  };

  // Save / Publish Vacancy
  const handleSaveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVacancy) return;
    const isNew = !vacancies.some((v) => v.id === editingVacancy.id);
    const url = isNew ? '/api/recruitment/vacancies' : `/api/recruitment/vacancies/${editingVacancy.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editingVacancy)
      });
      const data = await res.json();
      if (data.success) {
        setIsVacancyModalOpen(false);
        setEditingVacancy(null);
        loadVacancies();
      }
    } catch (err) {
      console.error('Error saving vacancy:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'Under Review':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Shortlisted':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Interview':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'Offered':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Hired':
        return 'bg-[#00e575]/20 text-[#00e575] border-[#00e575]/40 font-bold';
      case 'Rejected':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'Withdrawn':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      default:
        return 'bg-white/10 text-slate-300 border-white/20';
    }
  };

  return (
    <div className="space-y-6 text-white font-sans">
      {/* Recruitment Sub-Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e575]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00e575]">
              Recruitment &amp; Human Capital Registry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-0.5">
            Talent Acquisition &amp; Pipeline Management
          </h2>
          <p className="text-xs text-slate-400">
            Official record for advertised vacancies, speculative submissions, outbox queues, and talent pooling.
          </p>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => setSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'overview' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setSubTab('applications')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'applications' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Applications</span>
            {metrics.newApps > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px]">
                {metrics.newApps}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('vacancies')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'vacancies' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Vacancies ({vacancies.length})
          </button>

          <button
            onClick={() => setSubTab('talent_pool')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'talent_pool' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Talent Pool</span>
            <span className="text-[11px] opacity-75">({metrics.talentPool})</span>
          </button>

          <button
            onClick={() => setSubTab('outbox')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'outbox' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Outbox</span>
            {metrics.outboxFailed > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {metrics.outboxFailed}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'settings' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Settings
          </button>

          <button
            onClick={() => setSubTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'audit' ? 'bg-[#00e575] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: OVERVIEW KPI METRICS
      ========================================================================= */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Submissions</span>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">{metrics.totalApps}</p>
              <span className="text-[11px] text-slate-500">All registered records</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">New (Unreviewed)</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">{metrics.newApps}</p>
              <span className="text-[11px] text-blue-400/80">Pending HR screening</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Under Review</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{metrics.underReview}</p>
              <span className="text-[11px] text-amber-400/80">Assigned to reviewers</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Shortlisted</span>
              <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">{metrics.shortlisted}</p>
              <span className="text-[11px] text-purple-400/80">Qualified candidates</span>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">Interviews</span>
              <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">{metrics.interviews}</p>
              <span className="text-[11px] text-cyan-400/80">Active rounds</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-[#00e575]/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#00e575] tracking-wider">Offers &amp; Hired</span>
              <p className="text-2xl sm:text-3xl font-black text-[#00e575] font-mono">{metrics.offers + metrics.hired}</p>
              <span className="text-[11px] text-emerald-400/80">Successful outcomes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">General CV Pool</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">Speculative</span>
              </div>
              <p className="text-3xl font-black text-white font-mono">{metrics.generalCv}</p>
              <p className="text-xs text-slate-400">
                Candidates who submitted credentials without an open vacancy. Separated for distinct retention policies.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Talent Pool Consent</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00e575]/20 text-[#00e575]">Consented</span>
              </div>
              <p className="text-3xl font-black text-[#00e575] font-mono">{metrics.talentPool}</p>
              <p className="text-xs text-slate-400">
                Candidates with explicit 2-year retention permission. Reusable for strategic headhunting.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notification Outbox</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${metrics.outboxFailed > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-[#00e575]'}`}>
                  {metrics.outboxFailed > 0 ? 'Action Needed' : 'Healthy'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block">Pending</span>
                  <span className="text-xl font-bold text-white font-mono">{metrics.outboxPending}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Failed</span>
                  <span className="text-xl font-bold text-red-400 font-mono">{metrics.outboxFailed}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Asynchronous email notifications. Applications remain safe in DB regardless of email transport.
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-6 rounded-3xl bg-neutral-950 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-white font-display">Candidate Intake Pipeline</h4>
              <p className="text-xs text-slate-400">Review newly received candidates or manage open job postings.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSubTab('applications')}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Applications List</span>
              </button>
              <button
                onClick={() => {
                  setEditingVacancy({
                    id: '',
                    title: '',
                    department: 'Credit Risk & Underwriting',
                    location: 'Abuja Head Office (CBD)',
                    type: 'Full-Time',
                    experience: '3+ Years Banking',
                    salary_range: 'Competitive Scale',
                    description: '',
                    responsibilities: [],
                    requirements: [],
                    closing_date: '2026-12-31',
                    status: 'Published',
                    application_count: 0,
                    updated_at: new Date().toISOString()
                  });
                  setIsVacancyModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" weight="bold" />
                <span>Create New Vacancy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: APPLICATIONS LIST (SEARCH, FILTERS, PAGINATION)
      ========================================================================= */}
      {subTab === 'applications' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <form onSubmit={handleApplyFilters} className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Search text */}
              <div className="relative">
                <MagnifyingGlass className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, email, ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#00e575]"
                />
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview">Interview</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>

              {/* Submission type filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575] cursor-pointer"
                >
                  <option value="all">All Submission Types</option>
                  <option value="vacancy">Advertised Vacancy</option>
                  <option value="general">General CV (Speculative)</option>
                </select>
              </div>

              {/* Vacancy opening filter */}
              <div>
                <select
                  value={vacancyFilter}
                  onChange={(e) => setVacancyFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575] cursor-pointer"
                >
                  <option value="all">All Vacancies</option>
                  {vacancies.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Submit Button */}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black font-bold uppercase tracking-wider text-[11px] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Funnel className="w-4 h-4" weight="bold" />
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setVacancyFilter('all');
                    setReviewerFilter('all');
                    setTimeout(() => loadApplications(1), 50);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                  title="Reset filters"
                >
                  <ArrowCounterClockwise className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Table of Applications */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Target Role / Area</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingApps ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading candidate applications...
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No applications matched the current filters.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => loadApplicationDossier(app.id)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white group-hover:text-[#00e575]">
                        {app.reference_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{app.candidate_name}</div>
                        <div className="text-[11px] text-slate-400">{app.candidate_email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {app.submission_type === 'vacancy' ? app.vacancy_title : app.area_of_interest}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {app.submission_type === 'vacancy' ? app.vacancy_department : 'General Speculative'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${app.submission_type === 'vacancy' ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                          {app.submission_type === 'vacancy' ? 'Vacancy' : 'General CV'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {app.assigned_reviewer_name ? (
                          <span className="flex items-center gap-1.5 text-white">
                            <UserCheck className="w-3.5 h-3.5 text-[#00e575]" />
                            <span>{app.assigned_reviewer_name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadApplicationDossier(app.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#00e575] text-slate-300 hover:text-black transition-colors font-semibold text-[11px]"
                        >
                          Review Dossier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-2">
            <span>
              Showing {applications.length} of {appTotal} applications
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={appPage <= 1}
                onClick={() => loadApplications(appPage - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {appPage} / {appTotalPages}
              </span>
              <button
                disabled={appPage >= appTotalPages}
                onClick={() => loadApplications(appPage + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: VACANCIES MANAGEMENT (DRAFT, PUBLISHED, CLOSED)
      ========================================================================= */}
      {subTab === 'vacancies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-display">Advertised Positions</h3>
              <p className="text-xs text-slate-400">
                Only published vacancies accept applications. Closing a vacancy preserves existing applications.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingVacancy({
                  id: '',
                  title: '',
                  department: 'Credit Risk & Underwriting',
                  location: 'Abuja Head Office (CBD)',
                  type: 'Full-Time',
                  experience: '3+ Years Banking',
                  salary_range: 'Competitive Scale',
                  description: '',
                  responsibilities: [],
                  requirements: [],
                  closing_date: '2026-12-31',
                  status: 'Published',
                  application_count: 0,
                  updated_at: new Date().toISOString()
                });
                setIsVacancyModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>New Vacancy</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vacancies.map((v) => (
              <div
                key={v.id}
                className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#00e575] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {v.department}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${v.status === 'Published' ? 'bg-[#00e575]/10 text-[#00e575] border-[#00e575]/30' : v.status === 'Draft' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {v.status}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white font-display">{v.title}</h4>
                    <p className="text-xs text-slate-400">{v.location} &middot; {v.salary_range}</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingVacancy(v);
                      setIsVacancyModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                    title="Edit opening"
                  >
                    <PencilSimple className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {v.description}
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-white">
                    {v.application_count || 0} candidate applications received
                  </span>
                  <span>Closes: {v.closing_date || 'Open until filled'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: DEDICATED TALENT POOL
      ========================================================================= */}
      {subTab === 'talent_pool' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-[#00e575]/20 flex items-start gap-3">
            <Sparkle className="w-5 h-5 text-[#00e575] shrink-0 mt-0.5" weight="fill" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-bold text-white block">Verified Talent Pool Candidates</span>
              <p className="leading-relaxed">
                Candidates listed here gave affirmative, optional consent to keep their profile on file for future matching opportunities. Under NDPA policies, talent pool consent is retained for up to 2 years from submission date.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Area of Interest</th>
                  <th className="py-3 px-4">Consent Date</th>
                  <th className="py-3 px-4">Retention Expiry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingTalent ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading talent pool candidates...
                    </td>
                  </tr>
                ) : talentCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No candidates currently in talent pool.
                    </td>
                  </tr>
                ) : (
                  talentCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{c.reference_number}</td>
                      <td className="py-3 px-4 font-semibold text-white">{c.candidate_name}</td>
                      <td className="py-3 px-4">
                        <div>{c.candidate_phone}</div>
                        <div className="text-[11px] text-slate-400">{c.candidate_email}</div>
                      </td>
                      <td className="py-3 px-4 text-[#00e575] font-semibold">
                        {c.area_of_interest || c.vacancy_title || 'General'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {c.talent_pool_consent_at ? new Date(c.talent_pool_consent_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {c.retention_expiry ? new Date(c.retention_expiry).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => loadApplicationDossier(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#00e575] text-slate-300 hover:text-black font-semibold text-[11px] transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 5: EMAIL NOTIFICATION OUTBOX
      ========================================================================= */}
      {subTab === 'outbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-display">Notification Outbox Queue</h3>
              <p className="text-xs text-slate-400">
                Monitors delivery of HR notifications to hr@nexusfinance.com and candidate confirmations.
              </p>
            </div>
            <button
              onClick={loadOutbox}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowCounterClockwise className="w-4 h-4" />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingOutbox ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading notification outbox...
                    </td>
                  </tr>
                ) : outboxEmails.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Outbox queue is currently clear.
                    </td>
                  </tr>
                ) : (
                  outboxEmails.map((mail) => (
                    <tr key={mail.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-mono font-medium text-white">{mail.recipient}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${mail.recipient_type === 'hr' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-[#00e575] border border-emerald-500/20'}`}>
                          {mail.recipient_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-200">{mail.subject}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${mail.status === 'sent' ? 'bg-emerald-500/10 text-[#00e575]' : mail.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-300'}`}>
                          {mail.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{mail.attempts} / {mail.max_attempts}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {mail.sent_at ? new Date(mail.sent_at).toLocaleTimeString() : (mail.last_attempt ? new Date(mail.last_attempt).toLocaleTimeString() : 'Queued')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {mail.status !== 'sent' && (
                          <button
                            onClick={() => handleRetryEmail(mail.id)}
                            className="px-2.5 py-1 rounded bg-white/10 hover:bg-[#00e575] text-white hover:text-black text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 6: RETENTION, PRIVACY & CONFIGURATION
      ========================================================================= */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-6">
          <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white font-display">Recruitment Configuration</h3>
              <p className="text-xs text-slate-400">
                Define official HR recipients and statutory retention windows pursuant to the Nigeria Data Protection Act (NDPA).
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                  HR Notification Destination Email *
                </label>
                <input
                  type="email"
                  required
                  value={settings.hr_notification_email || 'hr@nexusfinance.com'}
                  onChange={(e) => setSettings({ ...settings, hr_notification_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  New vacancy applications and general submissions will be queued to this internal mailbox.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                    Unsuccessful Retention (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.retention_unsuccessful_days || '180'}
                    onChange={(e) => setSettings({ ...settings, retention_unsuccessful_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Default: 180 days (6 mos)</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                    General CV Retention (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.retention_general_cv_days || '365'}
                    onChange={(e) => setSettings({ ...settings, retention_general_cv_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Default: 365 days (1 yr)</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                    Talent Pool Retention (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.retention_talent_pool_days || '730'}
                    onChange={(e) => setSettings({ ...settings, retention_talent_pool_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Default: 730 days (2 yrs)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              {settingsSaved ? (
                <span className="text-xs text-[#00e575] flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" /> Settings successfully updated
                </span>
              ) : <div />}

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
          VIEW 7: AUDIT TRAIL LOGS
      ========================================================================= */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-display">Recruitment Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Immutable record of candidate reviews, reviewer assignments, and data purges.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowCounterClockwise className="w-4 h-4" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{log.user_name}</td>
                      <td className="py-3 px-4 text-slate-400">{log.user_role}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold text-[#00e575]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.entity_type}</td>
                      <td className="py-3 px-4 max-w-sm truncate text-slate-300 font-mono text-[11px]">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          APPLICANT DETAIL DOSSIER SLIDE-OVER / MODAL
      ========================================================================= */}
      {selectedAppId && selectedAppDossier && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-end p-0 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedAppId(null)}
        >
          <div
            className="w-full max-w-3xl min-h-screen sm:min-h-0 sm:max-h-[94vh] bg-neutral-950 border-l sm:border border-white/15 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div className="p-6 border-b border-white/10 bg-neutral-900/80 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(selectedAppDossier.status)}`}>
                    {selectedAppDossier.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 font-mono">
                    {selectedAppDossier.reference_number}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    &middot; Submitted {new Date(selectedAppDossier.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white font-display">
                  {selectedAppDossier.candidate_name}
                </h3>
                <p className="text-xs text-[#00e575] font-semibold">
                  {selectedAppDossier.submission_type === 'vacancy'
                    ? selectedAppDossier.vacancy_title
                    : `General Interest: ${selectedAppDossier.area_of_interest}`}
                </p>
              </div>

              <button
                onClick={() => setSelectedAppId(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* Feedback messages */}
              {actionSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-[#00e575]/30 text-[#00e575] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" weight="bold" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}
              {actionErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <WarningCircle className="w-4 h-4 shrink-0" weight="bold" />
                  <span>{actionErrorMsg}</span>
                </div>
              )}

              {/* Candidate Info Grid */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email</span>
                  <a href={`mailto:${selectedAppDossier.candidate_email}`} className="text-white hover:text-[#00e575] font-medium">
                    {selectedAppDossier.candidate_email}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone</span>
                  <a href={`tel:${selectedAppDossier.candidate_phone}`} className="text-white hover:text-[#00e575] font-medium">
                    {selectedAppDossier.candidate_phone}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Portfolio / LinkedIn</span>
                  {selectedAppDossier.portfolio_url ? (
                    <a
                      href={selectedAppDossier.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-medium truncate"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedAppDossier.portfolio_url}</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">None provided</span>
                  )}
                </div>
              </div>

              {/* Secure CV File Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#00e575]" />
                    <span>Curriculum Vitae Document</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-[#00e575] border border-emerald-500/20">
                    Scan: Clean
                  </span>
                </div>

                {selectedAppDossier.documents && selectedAppDossier.documents.length > 0 ? (
                  selectedAppDossier.documents.map((doc: any) => (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 border border-white/10">
                      <div>
                        <p className="font-semibold text-white">{doc.original_filename}</p>
                        <p className="text-[11px] text-slate-400">
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB &middot; SHA-256: {doc.file_sha256.slice(0, 16)}...
                        </p>
                      </div>

                      <a
                        href={`/api/recruitment/applications/${selectedAppDossier.id}/cv`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                      >
                        <DownloadSimple className="w-4 h-4" weight="bold" />
                        <span>View / Download CV</span>
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">No document on file.</p>
                )}
              </div>

              {/* Cover Note */}
              {selectedAppDossier.cover_note && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <span className="text-xs uppercase font-bold text-white block">Cover Note / Highlights</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedAppDossier.cover_note}
                  </p>
                </div>
              )}

              {/* Status & Reviewer Workflow Controls */}
              <div className="p-5 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-4">
                <span className="text-xs uppercase font-bold text-white block">Recruitment Decision Workflow</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Candidate Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575] cursor-pointer"
                    >
                      <option value="New">New</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Offered">Offered</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Assigned Reviewer
                    </label>
                    <select
                      value={newReviewer}
                      onChange={(e) => setNewReviewer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575] cursor-pointer"
                    >
                      <option value="">-- Unassigned --</option>
                      <option value="Executive Director (Credit Risk)">Executive Director (Credit Risk)</option>
                      <option value="Head of IT & Innovation">Head of IT &amp; Innovation</option>
                      <option value="Senior Operations Manager">Senior Operations Manager</option>
                      <option value="Human Capital Committee">Human Capital Committee</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Decision Note / Reason for Status Change
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared 1st stage technical screening; scheduled panel interview."
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUpdateStatus}
                    className="px-4 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Update Status
                  </button>
                  <button
                    onClick={handleAssignReviewer}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
                  >
                    Save Reviewer Assignment
                  </button>
                </div>

                {/* 1-Click Recruitment-to-Employee Handoff */}
                {(selectedAppDossier.application.status === 'Offered' || selectedAppDossier.application.status === 'Hired' || newStatus === 'Hired') && (
                  <div className="p-4 rounded-xl bg-[#00e575]/10 border border-[#00e575]/30 flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div>
                      <span className="text-xs font-bold text-[#00e575] flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" weight="bold" />
                        <span>1-Click Nexus People Onboarding</span>
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Enroll candidate into the workforce registry as official staff with auto-generated ID (NX-ID), leave balances, and verified CV transfer.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOnboardCandidate(selectedAppDossier.application.id)}
                      disabled={isOnboarding}
                      className="px-4 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" weight="bold" />
                      <span>{isOnboarding ? 'Onboarding...' : 'Onboard to Staff (NX-ID)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Internal Notes Section */}
              <div className="space-y-3">
                <span className="text-xs uppercase font-bold text-white block">
                  Internal Reviewer Notes ({selectedAppDossier.notes?.length || 0})
                </span>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Add an internal observation, background check note, or interview impression..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#00e575] resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-[#00e575] text-white hover:text-black text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Add Note
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {selectedAppDossier.notes?.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-white">{n.author_name} ({n.author_role})</span>
                        <span className="text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{n.note_text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History Trail */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-bold text-white block">Status History Audit Trail</span>
                <div className="space-y-2">
                  {selectedAppDossier.statusHistory?.map((h: any) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-white">
                          {h.previous_status ? `${h.previous_status} -> ` : ''}{h.new_status}
                        </span>
                        {h.comment && <p className="text-slate-400 mt-0.5">{h.comment}</p>}
                      </div>
                      <span className="text-slate-500 shrink-0 font-mono">
                        {new Date(h.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Privacy & Data Erasure */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span className="block font-semibold text-white">Retention Expiry:</span>
                  <span>{new Date(selectedAppDossier.retention_expiry).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={handlePurgeApplication}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-[11px] border border-red-500/20 cursor-pointer"
                >
                  Erase Dossier (NDPA)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE / EDIT VACANCY MODAL
      ========================================================================= */}
      {isVacancyModalOpen && editingVacancy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsVacancyModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-neutral-950 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display">
                {editingVacancy.id ? 'Edit Vacancy Opening' : 'Create New Vacancy Opening'}
              </h3>
              <button
                onClick={() => setIsVacancyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVacancy} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingVacancy.title}
                  onChange={(e) => setEditingVacancy({ ...editingVacancy, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  placeholder="e.g. Senior Credit Risk Analyst"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    Department
                  </label>
                  <select
                    value={editingVacancy.department}
                    onChange={(e) => setEditingVacancy({ ...editingVacancy, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  >
                    <option value="Credit Risk & Underwriting">Credit Risk &amp; Underwriting</option>
                    <option value="Operations & Branch">Operations &amp; Branch</option>
                    <option value="Fintech & Engineering">Fintech &amp; Engineering</option>
                    <option value="Institutional Sales">Institutional Sales</option>
                    <option value="Legal & Compliance">Legal &amp; Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    Publication Status
                  </label>
                  <select
                    value={editingVacancy.status}
                    onChange={(e) => setEditingVacancy({ ...editingVacancy, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  >
                    <option value="Published">Published (Accepting Applications)</option>
                    <option value="Draft">Draft (Hidden)</option>
                    <option value="Closed">Closed (Preserves Applications)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    value={editingVacancy.closing_date || ''}
                    onChange={(e) => setEditingVacancy({ ...editingVacancy, closing_date: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                  Salary / Compensation Scale
                </label>
                <input
                  type="text"
                  value={editingVacancy.salary_range}
                  onChange={(e) => setEditingVacancy({ ...editingVacancy, salary_range: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                  placeholder="e.g. Competitive Tier-1 Scale + Performance Share"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                  Role Description Overview *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingVacancy.description}
                  onChange={(e) => setEditingVacancy({ ...editingVacancy, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVacancyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00e575] text-black text-xs font-bold cursor-pointer"
                >
                  Save Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  UserPlus,
  ChartBar,
  Gear,
  Clock,
  ShieldCheck,
  Buildings,
  ArrowRight,
  PencilSimple,
  SignOut,
  Funnel,
  MagnifyingGlass
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { OnboardingModal } from './OnboardingModal';
import { ProfileEditModal } from './ProfileEditModal';

export const AdminView: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>({
    activeHeadcount: 0,
    totalHeadcount: 0,
    newlyOnboardedThisMonth: 0,
    departmentBreakdown: []
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  const fetchStatsAndActivity = async () => {
    try {
      const sRes = await fetch('/api/hrms/stats', {
        headers: { 'x-nexus-role': 'HR Administrator' }
      });
      const sData = await sRes.json();
      if (sData.success && sData.stats) {
        setStats(sData.stats);
      }

      const aRes = await fetch('/api/hrms/activity?limit=10', {
        headers: { 'x-nexus-role': 'HR Administrator' }
      });
      const aData = await aRes.json();
      if (aData.success && aData.activities) {
        setActivities(aData.activities);
      }

      const eRes = await fetch('/api/hrms/employees?limit=50', {
        headers: { 'x-nexus-role': 'HR Administrator' }
      });
      const eData = await eRes.json();
      if (eData.success && eData.employees) {
        setEmployees(eData.employees);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    fetchStatsAndActivity();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Admin Command Center Header with View Switcher */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e575] animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-widest text-[#00e575] font-bold">
              HR Administration Command Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            Workforce Management &amp; System Oversight
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Welcome, {user?.fullName || 'Dr. Amina Bello'} &bull; Master Operational Clearance
          </p>
        </div>

        {/* Admin Navigation Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00e575]/20 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" weight="bold" />
            <span>Onboard New Employee</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#hrms'; }}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Gear className="w-4 h-4 text-[#00e575]" />
            <span>Manage Systems &amp; Roles</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#staffportal'; }}
            className="px-3.5 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/20 cursor-pointer transition-colors"
            title="Switch View to Employee Self-Service"
          >
            Switch to Staff View
          </button>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 cursor-pointer transition-colors"
            title="Sign Out"
          >
            <SignOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Workforce Statistics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Active Headcount</span>
            <Users className="w-4 h-4 text-[#00e575]" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.activeHeadcount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Out of {stats.totalHeadcount} registered employees
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Newly Onboarded This Month</span>
            <UserPlus className="w-4 h-4 text-[#00e575]" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.newlyOnboardedThisMonth}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Joined in fiscal window
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Corporate Departments</span>
            <Buildings className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.departmentBreakdown?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Active organizational units
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Governance Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-[#00e575] font-mono">
            100%
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            NDPA &amp; ISO27001 compliant
          </div>
        </div>
      </div>

      {/* Main Grid: Employee Register & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Employee Directory & Status Management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search staff by name, email, or ID..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00e575] w-full sm:w-64"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {employees.length} personnel files
            </span>
          </div>

          <div className="rounded-2xl bg-neutral-900/60 border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department &amp; Cadre</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {employees
                    .filter((emp) => {
                      const matchSearch =
                        !filterSearch ||
                        emp.first_name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
                        emp.last_name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
                        emp.employee_number?.toLowerCase().includes(filterSearch.toLowerCase());
                      const matchStatus = !filterStatus || emp.employment_status === filterStatus;
                      return matchSearch && matchStatus;
                    })
                    .slice(0, 8)
                    .map((emp) => (
                      <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">{emp.first_name} {emp.last_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{emp.employee_number} &bull; {emp.official_email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-300 block">{emp.department_name || 'Operations'}</span>
                          <span className="text-[10px] text-[#00e575] font-semibold">{emp.designation_title || 'Officer'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.employment_status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {emp.employment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setEditingEmployee(emp)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                            title="Edit Status / Profile"
                          >
                            <PencilSimple className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Recent Activity Stream (audit_events) & Sidebar Controls */}
        <aside className="space-y-4 sidebar">
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Recent Activity Stream</span>
              <Clock className="w-4 h-4 text-[#00e575]" />
            </h3>
            <p className="text-[11px] text-slate-400">Live operational events logged to SQLite</p>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-200">{act.userName}</span>
                    <span className="font-mono">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#00e575] block">{act.action}</span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {typeof act.details === 'object' ? JSON.stringify(act.details) : act.details}
                  </span>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No activity records logged.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Onboarding Form Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={() => fetchStatsAndActivity()}
      />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        employee={editingEmployee}
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSuccess={() => fetchStatsAndActivity()}
      />
    </motion.div>
  );
};

export default AdminView;

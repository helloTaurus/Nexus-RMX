import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Users,
  CalendarCheck,
  Receipt,
  SignOut,
  ShieldCheck,
  Buildings,
  Phone,
  Envelope,
  Calendar,
  Clock,
  CheckCircle,
  MagnifyingGlass,
  ArrowRight
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeView: React.FC = () => {
  const { user, logout } = useAuth();
  const [securityLog, setSecurityLog] = useState<any>({
    lastLogin: new Date().toISOString(),
    activeSession: true,
    ipAddress: '127.0.0.1',
    recentLogins: []
  });
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryList, setDirectoryList] = useState<any[]>([]);
  const [showDirectory, setShowDirectory] = useState(false);

  useEffect(() => {
    fetch('/api/hrms/auth/security-log')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSecurityLog(data);
        }
      })
      .catch(() => {});

    fetch('/api/hrms/directory')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.directory) {
          setDirectoryList(data.directory);
        }
      })
      .catch(() => {});
  }, []);

  const initials = `${user?.firstName?.charAt(0) || 'E'}${user?.lastName?.charAt(0) || 'S'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      {/* 1. Identity & Welcome Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl avatar">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                {user?.employeeNumber || 'NX-0001'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 status">
                Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
              Welcome back, {user?.firstName || 'Employee'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 designation">
              {user?.designationTitle || 'Corporate Associate'} &bull; <span className="department">{user?.departmentName || 'Operations'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <SignOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Grid: Profile Card & Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 2. My Profile Card (HR Metadata) */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-neutral-900/60 border border-white/10 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <span>My Profile &amp; HR Contract Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[11px] block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Hire Date (Date of Joining)</span>
              </span>
              <span className="font-semibold text-slate-200 text-sm date_of_joining">
                {user?.date_of_joining || '2024-01-15'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[11px] block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reporting Manager</span>
              </span>
              <span className="font-semibold text-slate-200 text-sm reporting_manager">
                {user?.reportingManager || 'Executive Directorate'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[11px] block flex items-center gap-1.5">
                <Envelope className="w-3.5 h-3.5 text-blue-400" />
                <span>Official Email</span>
              </span>
              <span className="font-mono font-medium text-slate-200 official_email">
                {user?.email || 'staff@nexusfinance.com'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[11px] block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>Direct Phone</span>
              </span>
              <span className="font-semibold text-slate-200 text-sm phone">
                {user?.phone || '+234 800 000 0000'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Quick Links Panel */}
        <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Quick Self-Service</span>
          </h2>
          <p className="text-xs text-slate-400">Allowed operations &amp; public records</p>

          <div className="space-y-2 pt-2 text-xs">
            <button
              onClick={() => setShowDirectory(!showDirectory)}
              className="w-full p-3 rounded-xl bg-white/[0.04] hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 text-white font-semibold flex items-center justify-between cursor-pointer transition-colors DirectorySearch directory"
            >
              <div className="flex items-center gap-2.5">
                <MagnifyingGlass className="w-4 h-4 text-blue-400" />
                <span>Company Directory</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => { window.location.hash = '#staffportal'; }}
              className="w-full p-3 rounded-xl bg-white/[0.04] hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 text-white font-semibold flex items-center justify-between cursor-pointer transition-colors leave"
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-4 h-4 text-blue-400" />
                <span>Request Time-Off &amp; Leaves</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => { window.location.hash = '#expense'; }}
              className="w-full p-3 rounded-xl bg-white/[0.04] hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 text-white font-semibold flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-blue-400" />
                <span>Submit Expense Claims</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Directory Viewer if toggled */}
      {showDirectory && (
        <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Corporate Staff Directory</h3>
            <input
              type="text"
              placeholder="Search by name, department, or email..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {directoryList
              .filter((d) => !directorySearch || d.full_name?.toLowerCase().includes(directorySearch.toLowerCase()) || d.department_name?.toLowerCase().includes(directorySearch.toLowerCase()))
              .map((d) => (
                <div key={d.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                  <span className="font-bold text-white block">{d.first_name} {d.last_name}</span>
                  <span className="text-[11px] text-slate-400 block">{d.designation_title} &bull; {d.department_name}</span>
                  <span className="text-[11px] font-mono text-blue-400 block">{d.official_email}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Security Notification Tracker */}
      <div className="p-6 rounded-3xl bg-neutral-900/60 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span>Active Session &amp; Security Notification Tracker</span>
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            Active Session Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-500 text-[11px] block">Last Successful Login</span>
            <span className="font-semibold text-slate-200 font-mono">
              {new Date(securityLog.lastLogin).toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-500 text-[11px] block">Client IP Address</span>
            <span className="font-semibold text-slate-200 font-mono">
              {securityLog.ipAddress || '127.0.0.1'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-500 text-[11px] block">Security Clearances</span>
            <span className="font-semibold text-blue-400">
              Read-Only Self-Service (Employee)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeView;

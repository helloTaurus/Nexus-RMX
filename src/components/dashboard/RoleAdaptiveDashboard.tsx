import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { EmployeeView } from './EmployeeView';
import { AdminView } from './AdminView';
import { Key, LockKey, Clock, WarningCircle } from '@phosphor-icons/react';

interface RoleAdaptiveDashboardProps {
  onNavigate?: (view: string, productId?: string) => void;
}

export const RoleAdaptiveDashboard: React.FC<RoleAdaptiveDashboardProps> = () => {
  const { user, isAuthenticated, login } = useAuth();
  const [username, setUsername] = useState('amina.bello@nexusfinanceltd.com');
  const [password, setPassword] = useState('nexus2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const ok = await login(username, password);
    if (!ok) {
      setError('Invalid credentials or staff account deactivated.');
    }
    setLoading(false);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 pt-24 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Staff Authentication Portal</h2>
              <p className="text-xs text-slate-400">Sign in to access your self-service or admin dashboard</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <WarningCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Corporate Email / Staff ID</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Password or Access PIN</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {loading ? <Clock className="w-4 h-4 animate-spin" /> : <LockKey className="w-4 h-4" />}
              <span>Sign In</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 pt-24 sm:pt-28 px-4 sm:px-6 lg:px-8">
      <AnimatePresence mode="wait">
        {user.role === 'hr_admin' ? (
          <AdminView key="admin" />
        ) : (
          <EmployeeView key="employee" />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleAdaptiveDashboard;

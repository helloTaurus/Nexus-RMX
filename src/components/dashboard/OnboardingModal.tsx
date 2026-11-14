import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Clock } from '@phosphor-icons/react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    official_email: '',
    phone: '',
    department_id: 'dept-hcm',
    designation_id: 'desig-hcm-head',
    salary_monthly: 450000,
    role: 'Employee'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hrms/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nexus-role': 'HR Administrator'
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to onboard employee.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00e575]" />
              <h3 className="font-bold text-white text-base">Onboard New Employee</h3>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Corporate Email</label>
              <input
                type="email"
                required
                value={form.official_email}
                onChange={(e) => setForm({ ...form, official_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Monthly Gross Salary (NGN)</label>
                <input
                  type="number"
                  required
                  value={form.salary_monthly}
                  onChange={(e) => setForm({ ...form, salary_monthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-[#00e575] hover:bg-[#15f38a] text-black font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && <Clock className="w-4 h-4 animate-spin" />}
                <span>Complete Onboarding</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingModal;

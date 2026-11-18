import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PencilSimple, Clock } from '@phosphor-icons/react';

interface ProfileEditModalProps {
  employee: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [form, setForm] = useState({
    employment_status: employee?.employment_status || 'Active',
    branch_location: employee?.branch_location || 'Abuja Head Office (CBD)',
    department_id: employee?.department_id || 'dept-hcm'
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/employees/${employee.id}`, {
        method: 'PATCH',
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
      }
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
          className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <PencilSimple className="w-5 h-5 text-[#00e575]" />
              <h3 className="font-bold text-white text-base">Edit Employee Profile</h3>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Employment Status</label>
              <select
                value={form.employment_status}
                onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Probation">Probation</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Branch Location</label>
              <input
                type="text"
                value={form.branch_location}
                onChange={(e) => setForm({ ...form, branch_location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00e575]"
              />
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
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileEditModal;

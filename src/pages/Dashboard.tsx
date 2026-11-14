import React from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeView from '../components/dashboard/EmployeeView';
import AdminView from '../components/dashboard/AdminView';

export default function Dashboard() {
  const { user } = useAuth(); // Contains decrypted JWT payload: { id, role }

  return (
    <div className="min-h-screen bg-slate-950 p-6 pt-24 font-sans text-slate-100">
      {user?.role === 'hr_admin' ? <AdminView /> : <EmployeeView />}
    </div>
  );
}

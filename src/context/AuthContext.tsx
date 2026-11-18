import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  id: string;
  role: 'hr_admin' | 'employee';
  rawRole: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  departmentName?: string;
  designationTitle?: string;
  date_of_joining?: string;
  phone?: string;
  reportingManager?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserSession | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: async () => {},
  setUser: () => {}
});

export const normalizeRole = (roleStr: string): 'hr_admin' | 'employee' => {
  const r = (roleStr || '').toLowerCase().trim();
  if (
    r === 'hr administrator' ||
    r === 'super administrator' ||
    r === 'super_admin' ||
    r === 'hr_admin' ||
    r === 'system administrator' ||
    r === 'hr manager' ||
    r === 'master admin'
  ) {
    return 'hr_admin';
  }
  return 'employee';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>({
    id: 'emp_amina_bello',
    role: 'hr_admin',
    rawRole: 'HR Administrator',
    employeeNumber: 'NX-0001',
    firstName: 'Dr. Amina',
    lastName: 'Bello',
    fullName: 'Dr. Amina Bello',
    email: 'amina.bello@nexusfinanceltd.com',
    departmentName: 'Human Capital & Governance',
    designationTitle: 'Head of Human Capital Management',
    date_of_joining: '2024-01-15',
    phone: '+234 802 345 6789',
    reportingManager: 'Henrietta Okolo',
    permissions: ['manage_employees', 'onboard_employee', 'approve_leaves', 'manage_departments']
  });

  const login = async (username: string, pass: string) => {
    try {
      const res = await fetch('/api/hrms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass })
      });
      const data = await res.json();
      if (data.success && data.staff) {
        const normRole = normalizeRole(data.staff.role);
        setUser({
          id: data.staff.employeeId,
          role: normRole,
          rawRole: data.staff.role,
          employeeNumber: data.staff.employeeNumber,
          firstName: data.staff.firstName,
          lastName: data.staff.lastName,
          fullName: data.staff.fullName,
          email: data.staff.email,
          departmentName: data.staff.departmentName,
          designationTitle: data.staff.designationTitle,
          date_of_joining: data.staff.date_of_joining || '2024-01-15',
          phone: data.staff.phone,
          reportingManager: data.staff.reportingManager,
          permissions: data.staff.permissions
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/hrms/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { UserRole } from '../context/DashboardContext';

export const Login: React.FC = () => {
  const { login } = useDashboard();
  const [selectedRole, setSelectedRole] = useState<UserRole>('super-admin');
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('password');
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Smooth fade-in
    setIsVisible(true);
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'super-admin') {
      setEmail('superadmin@company.com');
    } else if (role === 'admin') {
      setEmail('admin@company.com');
    } else {
      setEmail('john.doe@company.com');
    }

    // Auto-focus email input
    setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setTimeout(() => {
      login(email, selectedRole);
      setIsSubmitting(false);
    }, 800); // login transition spinner
  };

  const getButtonText = () => {
    if (isSubmitting) return 'Authenticating...';
    if (selectedRole === 'super-admin') return 'Authorize Super Admin';
    if (selectedRole === 'admin') return 'Access Admin Panel';
    return 'Employee Login';
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen p-md relative overflow-hidden select-none w-full"
      style={{ backgroundColor: 'var(--th-bg-alt)' }}
    >
      {/* Side Decoration Elements */}
      <div className="fixed top-0 right-0 w-1/3 h-screen opacity-10 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-l from-primary to-transparent blur-[120px]"></div>
      </div>
      <div className="fixed bottom-0 left-0 w-1/4 h-64 opacity-5 pointer-events-none">
        <div
          className="w-full h-full blur-[80px]"
          style={{ backgroundColor: 'var(--th-bar-hover)' }}
        ></div>
      </div>

      <main className="relative z-10 w-full max-w-[480px]">
        <div className="glass-card rounded-xl p-xl flex flex-col items-center">
          {/* Branding */}
          <header className="text-center mb-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-lg mb-md shadow-[0_0_20px_rgba(124,58,237,0.5)]">
              <span className="material-symbols-outlined text-[40px] text-on-primary-container">
                notifications_active
              </span>
            </div>
            <h1
              className="font-headline-md text-headline-md tracking-tight text-on-surface"
            >
              HPNS
            </h1>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-[0.2em] mt-base">
              Notification System
            </p>
          </header>

          {/* Role Selection */}
          <div className="w-full">
            <p className="font-label-sm text-label-sm text-outline mb-md uppercase">Select Access Level</p>
            <div className="grid grid-cols-3 gap-sm mb-lg">
              {/* Super Admin */}
              <button
                type="button"
                className={`role-card flex flex-col items-center justify-center p-md rounded-lg bg-surface-container-low hover:bg-surface-variant transition-all text-on-surface ${
                  selectedRole === 'super-admin' ? 'active' : ''
                }`}
                onClick={() => handleRoleSelect('super-admin')}
              >
                <span className="material-symbols-outlined text-primary mb-xs">shield_person</span>
                <span className="font-label-sm text-label-sm text-center">Super Admin</span>
              </button>

              {/* Admin */}
              <button
                type="button"
                className={`role-card flex flex-col items-center justify-center p-md rounded-lg bg-surface-container-low hover:bg-surface-variant transition-all text-on-surface ${
                  selectedRole === 'admin' ? 'active' : ''
                }`}
                onClick={() => handleRoleSelect('admin')}
              >
                <span className="material-symbols-outlined text-primary mb-xs">
                  admin_panel_settings
                </span>
                <span className="font-label-sm text-label-sm text-center">Admin</span>
              </button>

              {/* Employee */}
              <button
                type="button"
                className={`role-card flex flex-col items-center justify-center p-md rounded-lg bg-surface-container-low hover:bg-surface-variant transition-all text-on-surface ${
                  selectedRole === 'employee' ? 'active' : ''
                }`}
                onClick={() => handleRoleSelect('employee')}
              >
                <span className="material-symbols-outlined text-primary mb-xs">badge</span>
                <span className="font-label-sm text-label-sm text-center">Employee</span>
              </button>
            </div>
          </div>

          {/* Login Form (Dynamic Reveal) */}
          <div
            className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${
              isVisible ? 'max-h-[500px] opacity-100 mt-md' : 'max-h-0 opacity-0'
            }`}
          >
            <form className="space-y-lg" onSubmit={handleSubmit}>
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1" htmlFor="email">
                  Work Email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    mail
                  </span>
                  <input
                    ref={emailInputRef}
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary input-glow transition-all placeholder:text-outline/50 text-on-surface"
                    style={{ backgroundColor: 'var(--th-surface-input)' }}
                    id="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    lock
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary input-glow transition-all placeholder:text-outline/50 text-on-surface"
                    style={{ backgroundColor: 'var(--th-surface-input)' }}
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                    style={{ backgroundColor: 'var(--th-surface-input)' }}
                    type="checkbox"
                  />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Remember device</span>
                </label>
                <a
                  className="font-label-sm text-label-sm text-primary hover:text-on-secondary-container transition-colors"
                  href="#forgot"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot Password?
                </a>
              </div>

              <button
                className={`w-full py-4 bg-primary-container text-on-primary-container font-label-md text-label-md font-bold rounded-lg shadow-lg hover:bg-inverse-primary active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-sm`}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                )}
                {getButtonText()}
              </button>
            </form>
          </div>

          {/* Footer Decoration */}
          <footer className="mt-xl pt-lg border-t border-outline-variant/30 w-full flex justify-center space-x-lg opacity-40 text-on-surface">
            <span className="font-label-sm text-label-sm">v4.2.0-STABLE</span>
            <span className="font-label-sm text-label-sm">ENCRYPTED END-TO-END</span>
          </footer>
        </div>
      </main>
    </div>
  );
};

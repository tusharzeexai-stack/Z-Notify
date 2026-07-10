import React from 'react';
import { useDashboard } from '../context/DashboardContext';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  placeholderText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  placeholderText = 'Search notifications...'
}) => {
  const { currentUser, logout, activeView, theme, toggleTheme } = useDashboard();

  if (!currentUser) return null;

  const getBreadcrumb = () => {
    const viewNames: Record<string, string> = {
      stats: 'Portal Home',
      compose: 'Compose Alert',
      review: 'Review Queue',
      flagged: 'Flagged Content',
      history: 'Dispatched History',
      settings: 'My Profile',
      'user-search': 'Target Matching',
      'notification-generator': 'Bulk Generator',
      'eligibility-rules': 'Scoring Matrix',
      'buckets': 'Buckets Classifier',
      'delivery-center': 'Delivery Queue',
      'users': 'Citizens Directory',
      'schemes': 'Welfare Schemes',
      'jobs': 'Job Vacancies',
      'services': 'Utility Services',
      'medical-facilities': 'Healthcare Clinics',
      'audit-logs': 'System Audit',
      'analytics': 'Visual Analytics',
    };
    return viewNames[activeView] || 'Admin Console';
  };

  // Predefined avatars matching design mocks
  const avatarUrl =
    currentUser.role === 'employee'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnFcMZjfcdKurUunjTo7eDfBWwCsVy_UqpI5oREvhfiIvdSo2QTDuabtlfgU2zp6M4ImVEibXzZP9LZ_DdAzQJKlrayK89R6H7XnIMcka2zWhuNujRWSwtqxVo5fFDm6B4LwgPe0Wv2tmKdn1ROHg3h398IT0u9Gi0TXnZfDPgvAifGLDo5DEc9GY32CklTH89QnpCrAX6vYO153YdbSk6CCPl4UhG8HDazW1nuBQQxShQD86T7B0fr9MqwmeGC23z1sqwjZdwYsjq'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQXDGkyJjAqsAiyKO3UeKFC-Vnrau5FXBbmRd2LVP3RP_1ADdX9psZCrOKBsirnz-3vzMAe3rBcs9C1dBDnFpC-PSa_UwVFfCz59ZFdIVyFwILA3vQEddxWBUYjy4klyyyyWUkQrDJ3RFoBsVUv3leT4eILrSgKsPWqpw5ZgJkq5HNOxnEt-2Qh9mO5CfXyCKo87QDLW6jU4vIEsiIoenrYMckQ5e3ymWXVySODig8nqsxO3HYhOf2Yv2-TR9-l41YQ88ShIH9RNpI';

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface-dim border-b border-outline-variant">
      <div className="flex items-center gap-md">
        <span className="font-headline-md text-headline-md font-bold text-primary tracking-tighter">
          HPNS
        </span>
        <div className="h-6 w-px bg-outline-variant mx-sm hidden md:block"></div>
        <span className="font-label-md text-label-md text-on-surface-variant hidden md:block">
          {getBreadcrumb()}
        </span>
      </div>

      <div className="flex items-center gap-md">
        {activeView !== 'compose' && activeView !== 'settings' && (
          <div className="bg-surface-variant/30 px-md py-1.5 rounded-lg border border-outline/30 focus-within:border-primary/50 transition-colors flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-label-md w-44 md:w-56 text-on-surface outline-none placeholder:text-outline/70"
              placeholder={placeholderText}
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center gap-xs md:gap-sm">
          {/* Theme Toggle Button */}
          <button
            className="theme-toggle mr-1"
            data-active={theme === 'light' ? 'true' : 'false'}
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            type="button"
          >
            <div className="toggle-knob">
              <span className="material-symbols-outlined">
                {theme === 'light' ? 'light_mode' : 'dark_mode'}
              </span>
            </div>
          </button>

          <span className="px-xs py-0.5 border border-primary text-primary text-[10px] rounded uppercase font-bold hidden sm:inline-block">
            {currentUser.role}
          </span>

          {/* User Profile dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-xs px-sm py-1 rounded-lg hover:bg-surface-variant transition-colors">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
                <img alt="User Avatar" className="w-full h-full object-cover" src={avatarUrl} />
              </div>
              <span className="hidden md:inline font-label-md text-label-md text-on-surface ml-1">
                {currentUser.name}
              </span>
              <span className="material-symbols-outlined text-outline text-[16px]">expand_more</span>
            </button>

            {/* Dropdown Menu on hover/click */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container border border-outline-variant shadow-xl rounded-lg hidden group-hover:block transition-all py-1">
              <div className="px-md py-sm border-b border-outline-variant">
                <p className="text-body-sm font-bold truncate text-on-surface">{currentUser.name}</p>
                <p className="text-[11px] font-mono-code truncate text-outline-variant">
                  {currentUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full px-md py-sm text-left font-label-md text-error hover:bg-error-container/10 flex items-center gap-md transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

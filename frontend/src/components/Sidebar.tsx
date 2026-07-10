import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ViewType } from '../context/DashboardContext';

export const Sidebar: React.FC = () => {
  const { currentUser, activeView, changeView, logout, notifications, reviews } = useDashboard();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super-admin';
  const isSuper = currentUser.role === 'super-admin';

  // Compute live badge counts matching FastAPI statuses
  const pendingCount = reviews.filter((r) => r.status === 'PENDING_REVIEW').length;
  const flaggedCount = notifications.filter((n) => n.status === 'FLAGGED').length;
  const unreadCount = notifications.filter((n) => n.status === 'APPROVED').length;

  const handleLinkClick = (e: React.MouseEvent, view: ViewType) => {
    e.preventDefault();
    changeView(view);
  };

  const getLinkClass = (view: ViewType) => {
    const base =
      'flex items-center gap-sm px-md py-xs font-label-sm text-[12px] uppercase tracking-wider transition-all duration-150 rounded-lg group w-full text-left ';
    if (activeView === view) {
      return base + 'bg-secondary-container text-on-secondary-container font-bold';
    }
    return base + 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40';
  };

  return (
    <aside className="bg-surface-container border-r border-outline-variant fixed left-0 top-16 h-[calc(100vh-64px)] w-[280px] flex flex-col py-md px-sm gap-y-sm z-40 hidden md:flex overflow-y-auto custom-scrollbar">
      {/* Workspace Header Info */}
      <div className="px-md mb-xs">
        <div className="flex items-center gap-sm">
          <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container font-bold text-[24px]">
              {isAdmin ? 'terminal' : 'campaign'}
            </span>
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm text-primary leading-none">Z-NOTIFY</p>
            <p className="font-label-sm text-[10px] uppercase tracking-wider text-outline">
              {currentUser.role.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-sm">
        {isAdmin ? (
          <>
            {/* Group 1: Overview */}
            <div>
              <p className="text-[10px] text-outline font-bold px-md uppercase tracking-widest mb-xs">Overview</p>
              <button className={getLinkClass('stats')} onClick={(e) => handleLinkClick(e, 'stats')}>
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Portal Home</span>
              </button>
              <button className={getLinkClass('analytics')} onClick={(e) => handleLinkClick(e, 'analytics')}>
                <span className="material-symbols-outlined text-[18px]">leaderboard</span>
                <span>Visual Analytics</span>
              </button>
            </div>

            {/* Group 2: HPNS Engines */}
            <div className="pt-xs">
              <p className="text-[10px] text-outline font-bold px-md uppercase tracking-widest mb-xs">HPNS Operations</p>
              {isSuper && (
                <>
                  <button className={getLinkClass('user-search')} onClick={(e) => handleLinkClick(e, 'user-search')}>
                    <span className="material-symbols-outlined text-[18px]">person_search</span>
                    <span>Target Matching</span>
                  </button>
                  <button className={getLinkClass('notification-generator')} onClick={(e) => handleLinkClick(e, 'notification-generator')}>
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Notification Generator</span>
                  </button>
                  <button className={getLinkClass('eligibility-rules')} onClick={(e) => handleLinkClick(e, 'eligibility-rules')}>
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>Scoring Matrix</span>
                  </button>
                  <button className={getLinkClass('user-management')} onClick={(e) => handleLinkClick(e, 'user-management')}>
                    <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    <span>User Management</span>
                  </button>
                </>
              )}
              {!isSuper && (
                <button className={getLinkClass('review')} onClick={(e) => handleLinkClick(e, 'review')}>
                  <span className="material-symbols-outlined text-[18px]">rate_review</span>
                  <span className="flex-1">Review Queue</span>
                  {pendingCount > 0 && (
                    <span className="bg-primary text-on-primary px-xs rounded text-[9px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              <button className={getLinkClass('flagged')} onClick={(e) => handleLinkClick(e, 'flagged')}>
                <span className="material-symbols-outlined text-[18px]">flag</span>
                <span className="flex-1">Flagged Logs</span>
                {flaggedCount > 0 && (
                  <span className="bg-error text-on-error px-xs rounded text-[9px] font-bold">
                    {flaggedCount}
                  </span>
                )}
              </button>
              <button className={getLinkClass('approved-queue')} onClick={(e) => handleLinkClick(e, 'approved-queue')}>
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                <span className="flex-1">Approved Queue</span>
                {unreadCount > 0 && (
                  <span className="bg-green-600 text-white px-xs rounded text-[9px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button className={getLinkClass('buckets')} onClick={(e) => handleLinkClick(e, 'buckets')}>
                <span className="material-symbols-outlined text-[18px]">category</span>
                <span>Buckets Classifier</span>
              </button>
              <button className={getLinkClass('delivery-center')} onClick={(e) => handleLinkClick(e, 'delivery-center')}>
                <span className="material-symbols-outlined text-[18px]">hub</span>
                <span>Delivery Queue</span>
              </button>
            </div>

            {/* Group 3: Inventories */}
            {isSuper && (
              <div className="pt-xs">
                <p className="text-[10px] text-outline font-bold px-md uppercase tracking-widest mb-xs">Inventories</p>
                <button className={getLinkClass('users')} onClick={(e) => handleLinkClick(e, 'users')}>
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span>Citizens</span>
                </button>
                <button className={getLinkClass('schemes')} onClick={(e) => handleLinkClick(e, 'schemes')}>
                  <span className="material-symbols-outlined text-[18px]">folder_open</span>
                  <span>Welfare Schemes</span>
                </button>
                <button className={getLinkClass('jobs')} onClick={(e) => handleLinkClick(e, 'jobs')}>
                  <span className="material-symbols-outlined text-[18px]">work</span>
                  <span>Job Vacancies</span>
                </button>
                <button className={getLinkClass('services')} onClick={(e) => handleLinkClick(e, 'services')}>
                  <span className="material-symbols-outlined text-[18px]">widgets</span>
                  <span>Utility Services</span>
                </button>
                <button className={getLinkClass('medical-facilities')} onClick={(e) => handleLinkClick(e, 'medical-facilities')}>
                  <span className="material-symbols-outlined text-[18px]">local_hospital</span>
                  <span>Healthcare Clinics</span>
                </button>
                <button className={getLinkClass('audit-logs')} onClick={(e) => handleLinkClick(e, 'audit-logs')}>
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span>System Audit</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Employee/Citizen View */}
            <div>
              <p className="text-[10px] text-outline font-bold px-md uppercase tracking-widest mb-xs">Citizen Portal</p>
              <button className={getLinkClass('my-notifications')} onClick={(e) => handleLinkClick(e, 'my-notifications')}>
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                <span className="flex-1">Inbox Alerts</span>
                {notifications.filter((n) => n.status === 'DELIVERED').length > 0 && (
                  <span className="bg-primary text-on-primary px-xs rounded text-[9px] font-bold">
                    {notifications.filter((n) => n.status === 'DELIVERED').length}
                  </span>
                )}
              </button>
              <button className={getLinkClass('received-approved')} onClick={(e) => handleLinkClick(e, 'received-approved')}>
                <span className="material-symbols-outlined text-[18px]">rule</span>
                <span className="flex-1">Received Approved</span>
                {unreadCount > 0 && (
                  <span className="bg-green-600 text-white px-xs rounded text-[9px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Bottom Controls */}
      <div className="mt-auto border-t border-outline-variant pt-xs flex flex-col gap-xs">
        <button className={getLinkClass('settings')} onClick={(e) => handleLinkClick(e, 'settings')}>
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span>My Profile</span>
        </button>
        <button
          className="flex items-center gap-sm px-md py-xs font-label-sm text-[12px] uppercase tracking-wider text-error/80 hover:text-error hover:bg-error-container/10 transition-all rounded-lg w-full text-left"
          onClick={logout}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

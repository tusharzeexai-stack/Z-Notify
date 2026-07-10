import React, { useState, useEffect } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import type { NotificationItem } from './context/DashboardContext';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ComposeNotification } from './components/ComposeNotification';
import { ReviewQueue } from './components/ReviewQueue';
import { FlaggedNotifications } from './components/FlaggedNotifications';
import { HistoryLog } from './components/HistoryLog';
import { MyNotifications } from './components/MyNotifications';
import { ReceivedApproved } from './components/ReceivedApproved';
import { ApprovedQueue } from './components/ApprovedQueue';
import { UserManagement } from './components/UserManagement';
import { Settings } from './components/Settings';

// HPNS Pages
import { Dashboard } from './pages/Dashboard';
import { UserSearch } from './pages/UserSearch';
import { NotificationGenerator } from './pages/NotificationGenerator';
import { Analytics } from './pages/Analytics';
import { AuditLogs } from './pages/AuditLogs';
import { EligibilityRules } from './pages/EligibilityRules';
import { Buckets } from './pages/Buckets';
import { DeliveryCenter } from './pages/DeliveryCenter';
import { Users } from './pages/Users';
import { Schemes } from './pages/Schemes';
import { Jobs } from './pages/Jobs';
import { Services } from './pages/Services';
import { MedicalFacilities } from './pages/MedicalFacilities';

const AppContent: React.FC = () => {
  const { currentUser, activeView, changeView, notifications } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [editItem, setEditItem] = useState<NotificationItem | null>(null);

  // Clear search term and edit item on view change to maintain clean states
  useEffect(() => {
    setSearchTerm('');
    if (activeView !== 'compose') {
      setEditItem(null);
    }
  }, [activeView]);

  // Atmospheric background particles
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.body.style.setProperty('--mouse-x', `${x}%`);
      document.body.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!currentUser) {
    return <Login />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super-admin';

  // Compute mobile unread alerts or review counts
  const pendingCount = notifications.filter((n) => n.status === 'PENDING_REVIEW').length;
  const unreadCount = notifications.filter((n) => n.status === 'APPROVED').length;

  const handleEditResubmit = (item: NotificationItem) => {
    setEditItem(item);
    changeView('compose');
  };

  const getSearchPlaceholder = () => {
    if (activeView === 'my-notifications') return 'Search alerts...';
    if (activeView === 'review') return 'Search review queue...';
    if (activeView === 'flagged') return 'Search flagged list...';
    return 'Search history logs...';
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'stats':
        return <Dashboard />;
      case 'analytics':
        return <Analytics />;
      case 'compose':
        return (
          <ComposeNotification
            editItem={editItem}
            onSuccess={() => {
              setEditItem(null);
              changeView('review');
            }}
          />
        );
      case 'review':
        return <ReviewQueue />;
      case 'flagged':
        return <FlaggedNotifications onEditResubmit={handleEditResubmit} />;
      case 'history':
        return <HistoryLog searchTerm={searchTerm} />;
      case 'my-notifications':
        return <MyNotifications searchTerm={searchTerm} />;
      case 'received-approved':
        return <ReceivedApproved searchTerm={searchTerm} />;
      case 'approved-queue':
        return <ApprovedQueue searchTerm={searchTerm} />;
      case 'user-management':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      
      // HPNS Pages
      case 'user-search':
        return <UserSearch />;
      case 'notification-generator':
        return <NotificationGenerator />;
      case 'eligibility-rules':
        return <EligibilityRules />;
      case 'buckets':
        return <Buckets />;
      case 'delivery-center':
        return <DeliveryCenter />;
      case 'users':
        return <Users />;
      case 'schemes':
        return <Schemes />;
      case 'jobs':
        return <Jobs />;
      case 'services':
        return <Services />;
      case 'medical-facilities':
        return <MedicalFacilities />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative antialiased select-none custom-scrollbar"
      style={{ backgroundColor: 'var(--th-bg)', color: 'var(--th-text)' }}
    >
      {/* Dynamic Cursor Spotlight Trail */}
      <style>{`
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(124, 58, 237, 0.02) 0%, transparent 40%);
          pointer-events: none;
          z-index: 100;
        }
      `}</style>

      {/* Atmospheric Background Glow Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full"
          style={{ backgroundColor: 'var(--th-accent-glow-strong)' }}
        ></div>
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] blur-[100px] rounded-full"
          style={{ backgroundColor: 'var(--th-accent-glow-secondary)' }}
        ></div>
      </div>

      {/* Navigation Layout Frame */}
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholderText={getSearchPlaceholder()}
      />

      <div className="flex pt-16 min-h-screen relative z-10">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 md:ml-[280px] p-lg md:p-xl max-w-[1440px] mx-auto w-full relative pb-24 md:pb-xl">
          {renderActiveView()}
        </main>
      </div>

      {/* Responsive Mobile Bottom Navigation Rail */}
      <footer
        className="md:hidden fixed bottom-0 left-0 w-full border-t border-outline-variant px-md h-16 flex items-center justify-around z-50"
        style={{ backgroundColor: 'var(--th-surface)' }}
      >
        {isAdmin ? (
          <>
             <button
               onClick={() => changeView('stats')}
               className={`flex flex-col items-center gap-xs text-[10px] uppercase font-bold tracking-tighter ${
                 activeView === 'stats' ? 'text-primary' : 'text-outline'
               }`}
             >
                <span className="material-symbols-outlined">dashboard</span>
                <span>Home</span>
             </button>
             <button
               onClick={() => changeView('analytics')}
               className={`flex flex-col items-center gap-xs text-[10px] uppercase font-bold tracking-tighter ${
                 activeView === 'analytics' ? 'text-primary' : 'text-outline'
               }`}
             >
                <span className="material-symbols-outlined">leaderboard</span>
                <span>Charts</span>
             </button>
            <button
              onClick={() => changeView('review')}
              className={`flex flex-col items-center gap-xs text-[10px] uppercase font-bold tracking-tighter relative ${
                activeView === 'review' ? 'text-primary' : 'text-outline'
              }`}
            >
              <span className="material-symbols-outlined">rate_review</span>
              <span>Review</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-on-primary text-[8px] font-bold px-1 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => changeView('delivery-center')}
              className={`flex flex-col items-center gap-xs text-[10px] uppercase font-bold tracking-tighter ${
                activeView === 'delivery-center' ? 'text-primary' : 'text-outline'
              }`}
            >
              <span className="material-symbols-outlined">hub</span>
              <span>Queue</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => changeView('my-notifications')}
              className={`flex flex-col items-center gap-xs text-[10px] uppercase font-bold tracking-tighter relative ${
                activeView === 'my-notifications' ? 'text-primary' : 'text-outline'
              }`}
            >
              <span className="material-symbols-outlined">notifications</span>
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-on-primary text-[8px] font-bold px-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => changeView('settings')}
              className={`flex flex-col items-center gap-xs text-[10px] uppercase font-bold tracking-tighter ${
                activeView === 'settings' ? 'text-primary' : 'text-outline'
              }`}
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </button>
          </>
        )}
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
}

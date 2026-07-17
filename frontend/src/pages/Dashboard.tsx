import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getScoringRuns } from '../utils/scoringStorage';

export const Dashboard: React.FC = () => {
  const { currentUser, changeView, fetchAnalytics, stats } = useDashboard();
  const [totalCitizens, setTotalCitizens] = useState<number>(0);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadTotalCitizens = async () => {
      try {
        const runs = await getScoringRuns();
        if (runs && runs.length > 0) {
          for (const run of runs) {
            if (run?.data && Array.isArray(run.data) && run.data.length > 0) {
              setTotalCitizens(run.data.length);
              return;
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
      setTotalCitizens(stats.total_users ?? 0);
    };
    loadTotalCitizens();
  }, [stats.total_users]);

  const isAdmin = currentUser?.role === 'super-admin' || currentUser?.role === 'admin';

  return (
    <div className="space-y-xl">
      {/* Welcome Header */}
      <div className="glass-card p-xl rounded-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
        <div>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
            Welcome Back
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-xs">
            {currentUser?.name || 'User'}
          </h1>
          <p className="font-body-md text-on-surface-variant mt-xs">
            You are logged in as <strong className="text-secondary">{currentUser?.role.toUpperCase()}</strong>.
            Manage citizens matching pipelines and notifications feeds.
          </p>
        </div>
        <div className="flex gap-sm">
          {currentUser?.role === 'super-admin' && (
            <button
              onClick={() => changeView('notification-generator')}
              className="bg-primary-container text-on-primary-container px-lg py-sm font-label-md rounded-lg hover:opacity-90 transition-all flex items-center gap-xs cursor-pointer"
            >
              <span className="material-symbols-outlined">bolt</span>
              <span>Match Citizens</span>
            </button>
          )}
          <button
            onClick={() => changeView(isAdmin ? 'review' : 'my-notifications')}
            className="bg-surface-container border border-outline-variant text-on-surface px-lg py-sm font-label-md rounded-lg hover:bg-surface-variant transition-all flex items-center gap-xs cursor-pointer"
          >
            <span className="material-symbols-outlined">list</span>
            <span>{isAdmin ? 'Review Queue' : 'My Notifications'}</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div className="bg-surface-container border border-outline-variant p-lg rounded-lg flex items-center gap-lg">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">groups</span>
            </div>
            <div>
              <p className="font-label-sm text-outline uppercase">Total Citizens</p>
              <p className="font-headline-md text-on-surface font-bold">
                {totalCitizens}
              </p>
            </div>
          </div>
          
          <div className="bg-surface-container border border-outline-variant p-lg rounded-lg flex items-center gap-lg">
            <div className="w-12 h-12 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">notification_important</span>
            </div>
            <div>
              <p className="font-label-sm text-outline uppercase">Generated Alerts</p>
              <p className="font-headline-md text-on-surface font-bold">{stats.notifications_generated || 0}</p>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant p-lg rounded-lg flex items-center gap-lg">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">pending_actions</span>
            </div>
            <div>
              <p className="font-label-sm text-outline uppercase">Pending Review</p>
              <p className="font-headline-md text-on-surface font-bold text-secondary">{stats.pending_reviews || 0}</p>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant p-lg rounded-lg flex items-center gap-lg">
            <div className="w-12 h-12 rounded-lg bg-error-container/10 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">send</span>
            </div>
            <div>
              <p className="font-label-sm text-outline uppercase">Dispatched Feed</p>
              <p className="font-headline-md text-on-surface font-bold text-tertiary">{stats.delivered || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Grid */}
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">HPNS Control Center</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {/* Box 1: User Directory */}
          {isAdmin && (
            <div className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-48 card-hover transition-all">
              <div>
                <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  Citizen Profiles Directory
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-sm">
                  View and manage master demographic details for citizen targeting and eligibility checking.
                </p>
              </div>
              <button
                onClick={() => changeView('users')}
                className="text-primary font-label-sm flex items-center gap-xs hover:underline mt-lg w-fit cursor-pointer"
              >
                Browse Directory <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Box 2: Schemes and Jobs inventories */}
          {isAdmin && (
            <div className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-48 card-hover transition-all">
              <div>
                <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary">folder_open</span>
                  Program Inventories
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-sm">
                  Configure welfare schemes, jobs, services, and medical options eligibility JSON parameters.
                </p>
              </div>
              <div className="flex gap-md mt-lg">
                <button
                  onClick={() => changeView('schemes')}
                  className="text-primary font-label-sm hover:underline cursor-pointer"
                >
                  Schemes
                </button>
                <span className="text-outline">|</span>
                <button
                  onClick={() => changeView('jobs')}
                  className="text-primary font-label-sm hover:underline cursor-pointer"
                >
                  Jobs
                </button>
                <span className="text-outline">|</span>
                <button
                  onClick={() => changeView('services')}
                  className="text-primary font-label-sm hover:underline cursor-pointer"
                >
                  Services
                </button>
              </div>
            </div>
          )}


          {/* Box 4: Dispatch Logs */}
          {isAdmin && (
            <div className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-48 card-hover transition-all">
              <div>
                <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase flex items-center gap-xs">
                  <span className="material-symbols-outlined text-outline">hub</span>
                  Delivery Operations Center
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-sm">
                  Inspect Twilio SMS, Firebase Push, and WhatsApp Meta logs dispatched by Celery workers.
                </p>
              </div>
              <button
                onClick={() => changeView('delivery-center')}
                className="text-primary font-label-sm flex items-center gap-xs hover:underline mt-lg w-fit cursor-pointer"
              >
                Delivery Console <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Box 5: Cohort Map */}
          {currentUser?.role === 'super-admin' && (
            <div className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-48 card-hover transition-all relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 80% 20%, var(--md-sys-color-primary) 0%, transparent 60%)' }}
              />
              <div>
                <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary">hub</span>
                  Cohort Map
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-sm">
                  View all <strong className="text-primary">66 HPNS persona segments</strong> — base cohorts (B×D×LC) and overlay flags — with citizen counts.
                </p>
              </div>
              <button
                onClick={() => changeView('cohorts')}
                className="text-primary font-label-sm flex items-center gap-xs hover:underline mt-lg w-fit cursor-pointer"
              >
                Open Cohort Map <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}


          {/* Citizen Box */}
          {!isAdmin && (
            <div className="col-span-12 md:col-span-3 bg-surface-container border border-outline-variant p-xl rounded-xl flex flex-col justify-center items-center text-center gap-lg">
              <span className="material-symbols-outlined text-[64px] text-primary">campaign</span>
              <div>
                <h3 className="font-headline-md text-on-surface">Welfare Recommendation Portal</h3>
                <p className="font-body-md text-on-surface-variant max-w-lg mt-xs">
                  Personalized government scheme details, vacancies, and health alerts curated based on your credentials.
                </p>
              </div>
              <button
                onClick={() => changeView('my-notifications')}
                className="bg-primary text-on-primary font-label-md px-xl py-md rounded-lg hover:opacity-90 transition-all flex items-center gap-xs cursor-pointer"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span>Open Notifications Inbox</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

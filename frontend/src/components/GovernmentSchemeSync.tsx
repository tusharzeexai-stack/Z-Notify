import React, { useState, useEffect } from 'react';

interface SyncStatus {
  enabled: boolean;
  interval_hours: number;
  is_running: boolean;
  current_log_id?: number;
  total_categories: number;
  total_schemes: number;
  active_schemes: number;
  last_sync_time?: string;
  last_status: string;
  last_error?: string;
}

interface SyncLog {
  id: number;
  started_at: string;
  finished_at?: string;
  category: string;
  status: string;
  records_processed: number;
  records_updated: number;
  records_failed: number;
  duration?: number;
  error_message?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const GovernmentSchemeSync: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('agriculture-rural-environment');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchStatusAndLogs = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/sync/status`),
        fetch(`${API_BASE}/admin/sync/logs?limit=15`)
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatus(sData);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData);
      }
    } catch (err) {
      console.error('Error loading sync telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
    const interval = setInterval(() => {
      fetchStatusAndLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerFullSync = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/sync/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      if (res.ok) {
        showToast('🚀 Full sync job successfully initialized!');
        fetchStatusAndLogs();
      } else {
        showToast('❌ Failed to trigger full sync.');
      }
    } catch (err) {
      showToast('❌ Error connecting to server.');
    } finally {
      setActionLoading(false);
    }
  };

  const triggerIncrementalSync = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/sync/incremental`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      if (res.ok) {
        showToast('⚡ Incremental sync job successfully dispatched!');
        fetchStatusAndLogs();
      } else {
        showToast('❌ Failed to trigger incremental sync.');
      }
    } catch (err) {
      showToast('❌ Error connecting to server.');
    } finally {
      setActionLoading(false);
    }
  };

  const triggerCategorySync = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/sync/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_slug: selectedCategory, force: true })
      });
      if (res.ok) {
        showToast(`📁 Sync for category '${selectedCategory}' started!`);
        fetchStatusAndLogs();
      } else {
        showToast('❌ Failed to start category sync.');
      }
    } catch (err) {
      showToast('❌ Server request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const pauseSync = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/sync/pause`, { method: 'POST' });
      if (res.ok) {
        showToast('⏸️ Active sync job paused.');
        fetchStatusAndLogs();
      }
    } catch (err) {
      showToast('❌ Failed to pause sync.');
    }
  };

  const resumeSync = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/sync/resume`, { method: 'POST' });
      if (res.ok) {
        showToast('▶️ Sync job resumed.');
        fetchStatusAndLogs();
      }
    } catch (err) {
      showToast('❌ Failed to resume sync.');
    }
  };

  return (
    <div className="space-y-lg p-md max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-surface-container-high border border-primary/30 text-on-surface px-md py-sm rounded-xl shadow-2xl flex items-center gap-sm animate-bounce">
          <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
          <span className="font-body-sm text-[13px]">{toastMessage}</span>
        </div>
      )}

      {/* Header & Status Banner */}
      <div className="bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low border border-outline-variant/60 rounded-2xl p-lg shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md relative z-10">
          <div>
            <div className="flex items-center gap-sm mb-xs">
              <span className="bg-primary/20 text-primary p-xs rounded-lg">
                <span className="material-symbols-outlined text-[24px]">sync_alt</span>
              </span>
              <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight">
                Government Schemes Sync Dashboard
              </h1>
            </div>
            <p className="font-body-sm text-outline text-[13px]">
              Playwright Crawler Engine • APScheduler Background Daemon • PostgreSQL Normalized Persistence
            </p>
          </div>

          <div className="flex items-center gap-sm">
            <div className={`px-md py-xs rounded-full border flex items-center gap-xs font-bold text-[12px] uppercase tracking-wider ${
              status?.is_running
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${status?.is_running ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{status?.is_running ? 'Crawling Engine Active' : 'Scheduler Daemon Idle'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-md shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-xs">Total Synced Schemes</p>
            <p className="text-[28px] font-headline-lg text-primary font-black">{status?.total_schemes ?? 0}</p>
            <p className="text-[11px] text-outline mt-xs font-medium">{status?.active_schemes ?? 0} active in portal</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">folder_special</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-md shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-xs">Active Categories</p>
            <p className="text-[28px] font-headline-lg text-secondary font-black">{status?.total_categories ?? 4}</p>
            <p className="text-[11px] text-outline mt-xs font-medium">Welfare, Health, Jobs, Services</p>
          </div>
          <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">category</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-md shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-xs">Sync Interval</p>
            <p className="text-[28px] font-headline-lg text-amber-400 font-black">{status?.interval_hours ?? 24}h</p>
            <p className="text-[11px] text-outline mt-xs font-medium">Auto APScheduler Enabled</p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">update</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-md shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-xs">Last Sync Execution</p>
            <p className="text-[14px] font-bold text-on-surface">
              {status?.last_sync_time ? new Date(status.last_sync_time).toLocaleTimeString() : 'Never'}
            </p>
            <p className="text-[11px] text-outline mt-xs font-medium">
              Status: <span className="uppercase text-emerald-400 font-bold">{status?.last_status ?? 'N/A'}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">history_toggle_off</span>
          </div>
        </div>
      </div>

      {/* Control Actions & Manual Triggers Toolbar */}
      <div className="bg-surface-container border border-outline-variant/50 rounded-2xl p-md shadow-lg space-y-md">
        <div className="flex items-center justify-between">
          <h2 className="font-title-md text-[16px] text-on-surface font-bold flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            Sync Operations Control Hub
          </h2>
          {status?.is_running && (
            <div className="flex items-center gap-xs">
              <button
                onClick={pauseSync}
                className="px-sm py-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[12px] font-bold hover:bg-amber-500/30 transition-all flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">pause</span> Pause Engine
              </button>
              <button
                onClick={resumeSync}
                className="px-sm py-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[12px] font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span> Resume Engine
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Full Sync Trigger */}
          <div className="p-sm bg-surface-container-high border border-outline-variant/40 rounded-xl space-y-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[13px] text-on-surface">Full Engine Synchronization</span>
              <span className="text-[10px] bg-primary/20 text-primary font-extrabold px-xs py-0.5 rounded">Comprehensive</span>
            </div>
            <p className="text-[11px] text-outline">Re-crawls all 4 categories, extracts latest scheme metadata, and refreshes database.</p>
            <button
              disabled={actionLoading || status?.is_running}
              onClick={triggerFullSync}
              className="w-full py-xs px-md bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-bold text-[12px] rounded-lg transition-all flex items-center justify-center gap-xs shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">motion_photos_on</span>
              Trigger Full Sync Now
            </button>
          </div>

          {/* Incremental Sync Trigger */}
          <div className="p-sm bg-surface-container-high border border-outline-variant/40 rounded-xl space-y-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[13px] text-on-surface">Incremental Update</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-xs py-0.5 rounded">Fast</span>
            </div>
            <p className="text-[11px] text-outline">Skips unchanged existing records and only synchronizes modified & new scheme pages.</p>
            <button
              disabled={actionLoading || status?.is_running}
              onClick={triggerIncrementalSync}
              className="w-full py-xs px-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[12px] rounded-lg transition-all flex items-center justify-center gap-xs shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Trigger Incremental Sync
            </button>
          </div>

          {/* Selective Category Sync */}
          <div className="p-sm bg-surface-container-high border border-outline-variant/40 rounded-xl space-y-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[13px] text-on-surface">Category Specific Target</span>
              <span className="text-[10px] bg-secondary/20 text-secondary font-extrabold px-xs py-0.5 rounded">Selective</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant text-on-surface text-[12px] rounded-lg p-xs focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="agriculture-rural-environment">🌾 Agriculture & Rural Welfare</option>
              <option value="health-wellness">🏥 Health & Wellness</option>
              <option value="skills-employment">💼 Skills & Employment</option>
              <option value="social-welfare-empowerment">🛡️ Social Welfare & Empowerment</option>
            </select>
            <button
              disabled={actionLoading || status?.is_running}
              onClick={triggerCategorySync}
              className="w-full py-xs px-md bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-on-secondary font-bold text-[12px] rounded-lg transition-all flex items-center justify-center gap-xs shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Sync Target Category
            </button>
          </div>
        </div>
      </div>

      {/* Operational Sync Execution Logs Table */}
      <div className="bg-surface-container border border-outline-variant/50 rounded-2xl p-md shadow-xl space-y-md">
        <div className="flex items-center justify-between">
          <h2 className="font-title-md text-[16px] text-on-surface font-bold flex items-center gap-xs">
            <span className="material-symbols-outlined text-secondary text-[20px]">assignment_turned_in</span>
            Synchronization Operational Logs
          </h2>
          <span className="text-[11px] text-outline font-medium">Auto-refreshed every 4s</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar border border-outline-variant/40 rounded-xl">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-outline text-[11px] uppercase tracking-wider font-bold">
                <th className="py-xs px-md">Log ID</th>
                <th className="py-xs px-md">Target Scope</th>
                <th className="py-xs px-md">Execution Status</th>
                <th className="py-xs px-md">Processed</th>
                <th className="py-xs px-md">Updated</th>
                <th className="py-xs px-md">Failed</th>
                <th className="py-xs px-md">Duration</th>
                <th className="py-xs px-md">Started At</th>
                <th className="py-xs px-md text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-on-surface">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-lg text-center text-outline italic">
                    No synchronization logs recorded yet. Click 'Trigger Full Sync' above to begin.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-surface-variant/30 transition-all">
                      <td className="py-sm px-md font-mono text-[12px] font-bold text-primary">#{log.id}</td>
                      <td className="py-sm px-md font-medium text-[12px]">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-semibold">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-sm px-md">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          log.status === 'running' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                          log.status === 'paused' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-sm px-md font-bold text-on-surface">{log.records_processed}</td>
                      <td className="py-sm px-md font-bold text-emerald-400">{log.records_updated}</td>
                      <td className="py-sm px-md font-bold text-red-400">{log.records_failed}</td>
                      <td className="py-sm px-md font-mono text-outline text-[12px]">
                        {log.duration ? `${log.duration}s` : '—'}
                      </td>
                      <td className="py-sm px-md text-outline text-[11px]">
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td className="py-sm px-md text-right">
                        {log.error_message && (
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="px-xs py-0.5 bg-error/20 text-error rounded text-[11px] font-bold hover:bg-error/30 transition-all"
                          >
                            {expandedLog === log.id ? 'Hide Error' : 'View Error'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedLog === log.id && log.error_message && (
                      <tr className="bg-error-container/10">
                        <td colSpan={9} className="p-md text-error font-mono text-[11px] whitespace-pre-wrap border-l-4 border-error">
                          <strong>Error Stacktrace:</strong>
                          <br />
                          {log.error_message}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

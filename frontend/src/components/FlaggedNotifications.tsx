import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

interface FlaggedProps {
  onEditResubmit: (item: any) => void;
}

export const FlaggedNotifications: React.FC<FlaggedProps> = () => {
  const { notifications, fetchNotifications, discardNotification, regenerateSingleNotification, users, fetchUsers, sendFlaggedToAdmin } = useDashboard();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const flaggedItems = notifications.filter((item) => item.status === 'FLAGGED');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDiscard = async (id: string, title: string) => {
    const ok = await discardNotification(id);
    if (ok) {
      showToast(`Flagged item "${title}" archived/deleted successfully.`);
      fetchNotifications();
    }
  };

  const handleRegenerate = async (id: string, title: string) => {
    setLoadingId(id);
    const ok = await regenerateSingleNotification(id);
    setLoadingId(null);
    if (ok) {
      showToast(`Flagged item "${title}" regenerated. Click 'Send to Admin' to submit.`);
      fetchNotifications();
    } else {
      showToast(`Failed to regenerate flagged item.`);
    }
  };

  const handleSendToAdmin = async (id: string, title: string) => {
    setSendingId(id);
    const ok = await sendFlaggedToAdmin(id);
    setSendingId(null);
    if (ok) {
      showToast(`Notification "${title}" sent back to Admin Review Queue.`);
      fetchNotifications();
    } else {
      showToast(`Failed to send to admin.`);
    }
  };

  return (
    <div className="space-y-xl">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 border border-primary bg-surface-container px-lg py-md rounded-lg shadow-2xl flex items-center gap-md"
        >
          <span className="material-symbols-outlined text-primary">notifications_active</span>
          <span className="text-body-sm text-on-background font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Flagged Logs</h1>
          <p className="font-body-md text-on-surface-variant">
            Explore recommendations flagged by manual reviewers or automated filters.
          </p>
        </div>
      </header>

      {/* Grid Layout */}
      {flaggedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-2xl border border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl">
          <span className="material-symbols-outlined text-[64px] text-tertiary mb-md">verified_user</span>
          <p className="text-on-surface font-headline-md">No Flagged Items</p>
          <p className="text-outline-variant font-body-sm mt-xs">All welfare recommendations are cleared.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {flaggedItems.map((item) => {
            const user = users.find((u) => u.id === item.user_id);
            const userName = user?.name || "Unknown Citizen";

            // Parse the personalized content JSON
            const content = item.personalized_content;
            let parsed: any = {};
            try {
              parsed = typeof content === 'string' && content.trim().startsWith('{') ? JSON.parse(content) : { message: content };
            } catch (e) {
              parsed = { message: content };
            }
            const displayTitle = parsed.title || item.title;
            const displayMessage = parsed.message || parsed.personalized_content || content || item.description;

            return (
              <div
                key={item.id}
                className="bg-surface-container border border-outline-variant p-lg rounded-xl relative group card-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                  <div className="flex justify-between items-start mb-md">
                    <div className="flex flex-col gap-xs">
                      <span className="text-label-sm uppercase tracking-wider rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-xs py-0.5 font-bold w-max">
                        FLAGGED
                      </span>
                      <div className="text-body-sm mt-xs text-on-surface">
                        <span className="font-bold">Citizen:</span> {userName} (User ID: <span className="font-mono-code text-[11px] bg-surface-container-high px-xs rounded">{item.user_id}</span>)
                      </div>
                    </div>
                    <span className="font-mono-code text-[11px] text-outline">Alert ID: {item.id}</span>
                  </div>
                  <h3 className="font-headline-md text-on-surface font-bold">
                    {displayTitle}
                  </h3>
                  <div className="space-y-md mb-lg mt-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-outline tracking-widest font-bold">AI Summary</span>
                      <p className="font-body-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">{displayMessage}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-md border-t border-outline-variant pt-lg mt-md">
                  {item.is_updated ? (
                    <button
                      type="button"
                      onClick={() => handleSendToAdmin(item.id, item.title)}
                      disabled={sendingId === item.id}
                      className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-sm transition-all flex items-center justify-center gap-xs rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>{sendingId === item.id ? 'SENDING...' : 'SEND TO ADMIN'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRegenerate(item.id, item.title)}
                      disabled={loadingId === item.id}
                      className="w-1/2 bg-primary text-on-primary hover:opacity-90 font-label-md py-sm transition-all flex items-center justify-center gap-xs rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">autorenew</span>
                      <span>{loadingId === item.id ? 'REGENERATING...' : 'REGENERATE'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDiscard(item.id, item.title)}
                    className="w-1/2 border border-error text-error hover:bg-error/10 font-label-md py-sm transition-all flex items-center justify-center gap-xs rounded cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    <span>DISCARD</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

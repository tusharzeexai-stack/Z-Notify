import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { NotificationItem } from '../context/DashboardContext';

interface HistoryLogProps {
  searchTerm: string;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ searchTerm }) => {
  const { notifications, fetchNotifications, sendNotification } = useDashboard();
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);
  const [filterPriority, setFilterPriority] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const sentList = notifications.filter((item) => item.status === 'APPROVED' || item.status === 'DELIVERED');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReRun = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    const ok = await sendNotification(item.id, 'SMS');
    if (ok) {
      showToast(`Notification "${item.title}" re-queued for delivery via SMS.`);
    }
  };

  const filteredItems = sentList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      filterPriority === 'All' || item.priority.toLowerCase() === filterPriority.toLowerCase();

    return matchesSearch && matchesPriority;
  });

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-error/10 text-error border border-error/20';
      case 'high':
        return 'bg-primary/10 text-primary border border-primary/20';
      default:
        return 'bg-secondary/10 text-secondary border border-secondary/20';
    }
  };

  const getJSONPayload = (item: NotificationItem) => {
    return JSON.stringify(item, null, 2);
  };

  return (
    <div className="space-y-xl relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 border border-primary bg-surface-container px-lg py-md rounded-lg shadow-2xl flex items-center gap-md"
        >
          <span className="material-symbols-outlined text-primary">autorenew</span>
          <span className="text-body-sm text-on-background font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <section className="mb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
          <div>
            <h1 className="font-headline-xl text-headline-xl mb-base text-on-surface">Dispatched History</h1>
            <p className="text-on-surface-variant font-body-md">
              Audit log trace for all approved citizen welfare notifications.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="mb-lg">
        <div className="bg-surface-container border border-outline-variant p-md flex flex-wrap items-center gap-gutter rounded-xl">
          <div className="flex items-center gap-sm px-md border-r border-outline-variant">
            <span className="material-symbols-outlined text-outline">priority_high</span>
            <select
              className="bg-transparent border-none text-label-md font-label-md text-on-surface focus:ring-0 cursor-pointer"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            type="button"
            className="text-primary font-label-md text-label-md ml-auto hover:underline"
            onClick={() => setFilterPriority('All')}
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* Timeline List */}
      <section className="space-y-base relative">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-2xl border border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">history</span>
            <p className="text-on-surface-variant font-label-md">No history logs matched.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="relative flex flex-col sm:flex-row gap-lg bg-surface-container border border-outline-variant p-lg hover:border-primary transition-colors cursor-pointer group rounded-xl"
            >
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-lg">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-xs mb-base">
                    <span className="font-label-md text-label-md text-on-surface font-bold">{item.title}</span>
                    <span className={`px-xs py-[1px] text-[10px] font-bold uppercase tracking-widest rounded ${getPriorityBadgeClass(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-on-surface-variant font-body-sm line-clamp-1">{item.description}</p>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] text-outline uppercase font-bold">Match Score</span>
                  <p className="text-[12px] text-on-surface font-semibold">{item.eligibility_score}% Match</p>
                </div>
                <div className="flex flex-col justify-center items-end">
                  <span className="text-outline font-label-sm mb-base hidden md:block">Generated At</span>
                  <span className="text-on-surface font-mono-code hidden md:block truncate max-w-full">
                    {new Date(item.generated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Side Drawer details */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-surface-container border-l border-outline-variant z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${
          selectedItem ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedItem && (
          <>
            <div className="p-lg border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-on-surface">Payload Details</h2>
              <button
                type="button"
                className="material-symbols-outlined p-base hover:bg-surface-variant rounded-full text-on-surface cursor-pointer"
                onClick={() => setSelectedItem(null)}
              >
                close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-lg space-y-xl custom-scrollbar">
              <div>
                <span className="text-outline font-label-sm uppercase tracking-widest block mb-sm">
                  Notification ID
                </span>
                <p className="font-mono-code text-primary p-sm rounded border border-outline-variant bg-surface-dim">
                  {selectedItem.id}
                </p>
              </div>

              <div>
                <span className="text-outline font-label-sm uppercase tracking-widest block mb-sm">
                  Personalized AI summary
                </span>
                <div className="bg-surface-dim p-md rounded border border-outline-variant text-body-sm text-on-surface leading-relaxed whitespace-pre-line">
                  {selectedItem.personalized_content || selectedItem.description}
                </div>
              </div>

              <div>
                <span className="text-outline font-label-sm uppercase tracking-widest block mb-sm">
                  JSON Model Payload
                </span>
                <pre className="p-md rounded font-mono-code text-[11px] text-tertiary overflow-x-auto border border-outline-variant bg-surface-dim max-h-64 custom-scrollbar">
                  {getJSONPayload(selectedItem)}
                </pre>
              </div>
            </div>
            <div className="p-lg bg-surface-container-high border-t border-outline-variant flex gap-md">
              <button
                type="button"
                onClick={(e) => handleReRun(e, selectedItem)}
                className="w-full py-md bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all cursor-pointer"
              >
                Re-dispatch alert (SMS)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { NotificationItem } from '../context/DashboardContext';

interface ReceivedApprovedProps {
  searchTerm: string;
}

export const ReceivedApproved: React.FC<ReceivedApprovedProps> = ({ searchTerm }) => {
  const { notifications, currentUser, fetchNotifications } = useDashboard();
  const [filterPriority, setFilterPriority] = useState('All');
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (!currentUser) return null;

  // Filter approved notifications
  const myAlerts = notifications.filter(
    (n) => n.status === 'APPROVED'
  );

  const handleCardClick = (item: NotificationItem) => {
    setSelectedItem(item);
  };

  const getFilteredAlerts = () => {
    return myAlerts.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority =
        filterPriority === 'All' || item.priority.toLowerCase() === filterPriority.toLowerCase();

      return matchesSearch && matchesPriority;
    });
  };

  const filteredAlerts = getFilteredAlerts();

  const getPriorityIconColor = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-error/10 text-error';
      case 'high':
        return 'bg-primary/10 text-primary';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-outline-variant/10 text-outline-variant';
    }
  };

  return (
    <div className="space-y-xl relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Received Approved</h1>
          <p className="text-on-surface-variant font-body-md">
            Welfare recommendations reviewed and approved by administrators.
          </p>
        </div>
        <div className="flex gap-xs">
          <div className="relative">
            <select
              className="appearance-none bg-surface-container-high border border-outline-variant text-on-surface pl-md pr-10 py-xs text-label-md rounded-lg focus:ring-0 cursor-pointer font-label-md"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
              filter_list
            </span>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        {/* Left Column: Feed list */}
        <div className="lg:col-span-2 space-y-sm">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-2xl border border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl">
              <span className="material-symbols-outlined text-[64px] text-outline-variant mb-md">rule</span>
              <p className="text-on-surface-variant font-label-md">No approved notifications found. Waiting for admin dispatch.</p>
            </div>
          ) : (
            filteredAlerts.map((item) => {
              const content = item.personalized_content || item.description;
              let parsed: any = {};
              try {
                parsed = typeof content === 'string' && content.trim().startsWith('{') ? JSON.parse(content) : { message: content };
              } catch (e) {
                parsed = { message: content };
              }
              const displayTitle = parsed.title || item.title;
              const displayMessage = parsed.description || parsed.message || parsed.personalized_content || content;

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className={`group relative border border-outline-variant transition-all cursor-pointer p-md flex gap-lg rounded bg-surface-container-low hover:border-primary ${
                    selectedItem?.id === item.id ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded flex items-center justify-center ${getPriorityIconColor(item.priority)}`}>
                    <span className="material-symbols-outlined">
                      {item.priority === 'critical' ? 'security' : 'campaign'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-base">
                      <h3 className="font-label-md text-on-surface font-bold truncate pr-md">
                        {displayTitle}
                      </h3>
                      <span className="text-[11px] text-outline font-mono-code">
                        Match: {item.eligibility_score}%
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-body-sm line-clamp-2 mb-md">
                      {displayMessage}
                    </p>
                    <button
                      type="button"
                      className="text-primary font-label-sm hover:underline flex items-center gap-xs"
                    >
                      View personalized details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Details Card */}
        <div className="lg:col-span-1">
          {selectedItem ? (() => {
            const content = selectedItem.personalized_content || selectedItem.description;
            let parsed: any = {};
            try {
              parsed = typeof content === 'string' && content.trim().startsWith('{') ? JSON.parse(content) : { message: content };
            } catch (e) {
              parsed = { message: content };
            }
            const displayTitle = parsed.title || selectedItem.title;
            const displayMessage = parsed.description || parsed.message || parsed.personalized_content || content;

            return (
              <div className="glass-card p-lg rounded-xl space-y-md border border-primary/40 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-outline-variant pb-md">
                  <span className={`px-sm py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${getPriorityIconColor(selectedItem.priority)}`}>
                    {selectedItem.priority}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="material-symbols-outlined text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-variant cursor-pointer"
                  >
                    close
                  </button>
                </div>

                <div>
                  <h3 className="font-headline-sm font-bold leading-tight mb-xs text-on-surface">
                    {displayTitle}
                  </h3>
                  <p className="text-outline font-mono-code text-[11px]">Category: {selectedItem.category}</p>
                  <p className="text-[11px] text-outline-variant mt-1">Generated: {new Date(selectedItem.generated_at).toLocaleString()}</p>
                </div>

                <div className="p-md rounded border border-outline-variant text-body-sm text-on-surface leading-relaxed whitespace-pre-line bg-surface-dim">
                  {displayMessage}
                </div>

                <div className="text-[11px] text-outline border-t border-outline-variant/30 pt-sm">
                  <strong>Match Scorer Insight:</strong> {selectedItem.reason_for_match}
                </div>
              </div>
            );
          })() : (
            <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-lg text-center flex flex-col justify-center items-center h-48 opacity-70">
              <span className="material-symbols-outlined text-outline text-[40px] mb-xs">
                touch_app
              </span>
              <p className="text-outline-variant font-label-sm">Select an alert to view full details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

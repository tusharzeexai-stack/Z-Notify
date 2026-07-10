import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

const DOMAIN_BUCKETS = [
  "Employment",
  "Education",
  "Healthcare",
  "Housing",
  "Welfare",
  "Skill Development",
  "Agriculture",
  "Women Empowerment",
  "Senior Citizens",
  "Disability Support"
];

export const Buckets: React.FC = () => {
  const { notifications, fetchNotifications } = useDashboard();
  const [selectedBucket, setSelectedBucket] = useState("Welfare");

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Compute counts
  const bucketCounts = DOMAIN_BUCKETS.reduce((acc, b) => {
    // Simple classification check locally to keep it dynamic
    const count = notifications.filter(n => n.category === b || (b === "Welfare" && n.category === "Welfare")).length;
    acc[b] = count;
    return acc;
  }, {} as Record<string, number>);

  const filteredNotifs = notifications.filter(n => {
    if (selectedBucket === "Welfare") return n.category === "Welfare" || n.category === "Service";
    if (selectedBucket === "Employment") return n.category === "Employment";
    if (selectedBucket === "Healthcare") return n.category === "Healthcare";
    // General keyword fallback search
    const text = (n.title + " " + n.description).toLowerCase();
    return text.includes(selectedBucket.toLowerCase());
  });

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Classification Buckets</h1>
        <p className="font-body-md text-on-surface-variant">
          Explore HPNS eligibility matches segmented into thematic citizen-centric categories.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Left Side: Buckets list */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-md space-y-xs">
          <div className="font-label-sm text-outline uppercase px-sm pb-xs mb-sm border-b border-outline-variant font-bold">
            Thematic Domains
          </div>
          {DOMAIN_BUCKETS.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBucket(b)}
              className={`w-full text-left px-md py-sm rounded font-label-md flex justify-between items-center transition-all cursor-pointer ${
                selectedBucket === b ? 'bg-primary-container text-on-primary-container font-bold' : 'hover:bg-surface-variant/30 text-on-surface-variant'
              }`}
            >
              <span>{b}</span>
              <span className="bg-surface-container-high border border-outline-variant px-xs py-0.5 rounded text-[11px] font-bold">
                {bucketCounts[b] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Right Side: Alerts in selected bucket */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col h-[520px]">
          <div className="border-b border-outline-variant pb-md mb-md font-bold text-on-surface flex justify-between items-center">
            <span>{selectedBucket} Matches Feed</span>
            <span className="text-outline text-[12px] font-mono-code">{filteredNotifs.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-md">
            {filteredNotifs.length === 0 ? (
              <p className="text-outline text-center py-xl">No active notifications classified under this bucket currently.</p>
            ) : (
              filteredNotifs.map((n) => (
                <div key={n.id} className="bg-surface-container-low border border-outline-variant p-md rounded-lg space-y-xs">
                  <div className="flex justify-between items-center">
                    <h3 className="font-label-md text-on-surface font-bold">{n.title}</h3>
                    <span className={`px-xs py-0.5 rounded text-[10px] font-bold uppercase ${
                      n.priority === 'high' || n.priority === 'critical' ? 'bg-error-container text-error' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                      {n.priority}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{n.description}</p>
                  <div className="flex justify-between items-center text-[10px] text-outline font-mono-code pt-xs border-t border-outline-variant/50">
                    <span>SCORE: {n.eligibility_score}%</span>
                    <span>STATUS: {n.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

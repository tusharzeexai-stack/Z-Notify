import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getScoringRuns, deleteScoringRun } from '../utils/scoringStorage';

export const Users: React.FC = () => {
  const { fetchUsers, fetchSavedGenerations, sendToReview, deleteSavedGenerations } = useDashboard();
  const [msg, setMsg] = useState('');

  // Tab State: 'runs' or 'saved_generations'
  const [activeTab, setActiveTab] = useState<'runs' | 'saved_generations'>(() => {
    const defaultTab = localStorage.getItem('hpns_default_tab');
    if (defaultTab === 'runs' || defaultTab === 'saved_generations') {
      localStorage.removeItem('hpns_default_tab');
      return defaultTab;
    }
    return 'saved_generations';
  });
  
  // Saved Runs State
  const [savedRuns, setSavedRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');

  const [savedGens, setSavedGens] = useState<any[]>([]);
  const [viewNotifsModal, setViewNotifsModal] = useState<any[] | null>(null);

  useEffect(() => {
    fetchUsers();
    loadSavedRuns();
    loadSavedGens();
  }, []);

  const loadSavedGens = async () => {
    const gens = await fetchSavedGenerations();
    setSavedGens(gens);
  };

  const handleSendToReview = async (userId: string) => {
    const ok = await sendToReview(userId);
    if (ok) {
      setMsg('Notifications sent to Admin Review Queue!');
      loadSavedGens();
    } else {
      setMsg('Failed to send notifications to review.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const handleDeleteDrafts = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete the generated notifications for this user?")) return;
    const ok = await deleteSavedGenerations(userId);
    if (ok) {
      setMsg('Notifications deleted successfully.');
      loadSavedGens();
    } else {
      setMsg('Failed to delete notifications.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const loadSavedRuns = async () => {
    try {
      const runs = await getScoringRuns();
      setSavedRuns(runs);
    } catch (err) {
      console.error("Failed to load saved runs", err);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!window.confirm("Are you sure you want to delete this saved scoring run?")) return;
    try {
      await deleteScoringRun(runId);
      const runs = await getScoringRuns();
      setSavedRuns(runs);
      if (selectedRun && selectedRun.id === runId) {
        setSelectedRun(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter out the seed mock data (superadmin, admin, and john.doe@company.com)
  // const citizenUsers = users.filter((u: any) => 
  //   u.role === 'employee' && u.email !== 'john.doe@company.com'
  // );

  const filteredTableData = selectedRun && selectedRun.data ? selectedRun.data.filter((row: any) => {
    if (!tableSearchQuery) return true;
    const query = tableSearchQuery.toLowerCase();
    return (
      (row.user_id && String(row.user_id).toLowerCase().includes(query)) ||
      (row.name && String(row.name).toLowerCase().includes(query)) ||
      (row.district && String(row.district).toLowerCase().includes(query)) ||
      (row.state && String(row.state).toLowerCase().includes(query)) ||
      (row.Occupation && String(row.Occupation).toLowerCase().includes(query)) ||
      (row.Working_status && String(row.Working_status).toLowerCase().includes(query)) ||
      (row.primary_category && String(row.primary_category).toLowerCase().includes(query))
    );
  }) : [];

  const handleCopyTableData = () => {
    if (!selectedRun || !selectedRun.data || selectedRun.data.length === 0) return;
    
    const dataToCopy = filteredTableData;
    if (dataToCopy.length === 0) {
      alert("No data matches the search criteria to copy.");
      return;
    }

    const headers = [
      "user_id", "name", "age", "primary_category", "notification_tag",
      "content_score", "scheme_score", "job_score", "service_score",
      "engagement_time_min", "notification_click", "preferred_language",
      "mobile_no", "bpl_category", "personal_income", "family_income",
      "family_type_id", "Occupation", "Working_status", "district", "pincode", "house_ownership"
    ];

    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of dataToCopy) {
      const values = headers.map(header => {
        const val = row[header] !== undefined ? String(row[header]) : "";
        if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(","));
    }

    const csvContent = csvRows.join("\n");

    navigator.clipboard.writeText(csvContent)
      .then(() => {
        setMsg("Table data copied to clipboard as CSV!");
        setTimeout(() => setMsg(""), 3000);
      })
      .catch(err => {
        console.error("Failed to copy table data", err);
        alert("Failed to copy data to clipboard.");
      });
  };

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Citizen Database Directory</h1>
        <p className="font-body-md text-on-surface-variant">
          Inspect demographic records and update parameters for the personalized matching matrix.
        </p>
      </div>

      {msg && (
        <div className="bg-primary/20 border border-primary p-md rounded text-on-surface font-bold text-center">
          {msg}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-outline-variant gap-md">
        <button
          onClick={() => { setActiveTab('runs'); setSelectedRun(null); }}
          className={`pb-sm font-bold text-body-md transition-all border-b-2 cursor-pointer ${
            activeTab === 'runs' || selectedRun
              ? 'border-primary text-primary' 
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          📂 Saved Scoring Runs ({savedRuns.length})
        </button>
        <button
          onClick={() => { setActiveTab('saved_generations'); setSelectedRun(null); }}
          className={`pb-sm font-bold text-body-md transition-all border-b-2 cursor-pointer ${
            activeTab === 'saved_generations'
              ? 'border-primary text-primary' 
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          🗄️ Saved Generations ({savedGens.length})
        </button>
      </div>

      {selectedRun ? (
        /* Saved Table Detailed View */
        <div className="space-y-md">
          <div className="flex justify-between items-center bg-surface-container-high p-md rounded-xl border border-outline-variant flex-wrap gap-sm">
            <div>
              <h3 className="font-bold text-on-surface text-body-lg">
                Scoring Run Report: {selectedRun.timestamp}
              </h3>
              <p className="text-[12px] text-outline">
                Total processed rows in this view: {selectedRun.data?.length || 0}
                {tableSearchQuery && ` (matching search: ${filteredTableData.length})`}
              </p>
            </div>
            <button
              onClick={() => { setSelectedRun(null); setTableSearchQuery(''); }}
              className="px-md py-xs bg-primary text-on-primary font-bold text-body-sm rounded hover:opacity-90 cursor-pointer"
            >
              ⬅ Back to runs list
            </button>
          </div>

          {/* Search and Copy Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-md bg-surface-container p-md rounded-xl border border-outline-variant">
            <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs w-full sm:w-96">
              <span className="material-symbols-outlined text-[20px] text-outline">search</span>
              <input
                type="text"
                placeholder="Search citizen name, ID, state, district, occupation..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="bg-transparent border-none text-on-surface text-body-sm focus:outline-none w-full py-xs"
              />
              {tableSearchQuery && (
                <button
                  onClick={() => setTableSearchQuery('')}
                  className="text-outline hover:text-on-surface cursor-pointer p-xs flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-sm w-full sm:w-auto justify-end">
              <button
                onClick={handleCopyTableData}
                className="px-md py-sm bg-primary-container text-on-primary-container font-bold text-body-sm rounded hover:opacity-90 cursor-pointer flex items-center gap-xs transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span>Copy to Clipboard (CSV)</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left text-body-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-container-high border-b border-outline-variant/30 text-outline font-bold">
                    <th className="p-md">User ID</th>
                    <th className="p-md">Name</th>
                    <th className="p-md">Age</th>
                    <th className="p-md">Primary Category</th>
                    <th className="p-md">Notification Tag</th>
                    <th className="p-md text-right">Content Score</th>
                    <th className="p-md text-right">Scheme Score</th>
                    <th className="p-md text-right">Job Score</th>
                    <th className="p-md text-right">Service Score</th>
                    <th className="p-md text-right">Engagement Time (Min)</th>
                    <th className="p-md text-right">Notification Click</th>
                    <th className="p-md">Preferred Language</th>
                    <th className="p-md">Mobile No</th>
                    <th className="p-md">BPL Category</th>
                    <th className="p-md text-right">Personal Income</th>
                    <th className="p-md text-right">Family Income</th>
                    <th className="p-md">Family Type ID</th>
                    <th className="p-md">Occupation</th>
                    <th className="p-md">Working Status</th>
                    <th className="p-md">District</th>
                    <th className="p-md">Pincode</th>
                    <th className="p-md">House Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row: any, index: number) => (
                    <tr key={index} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                      <td className="p-md font-mono-code select-all">
                        <div className="flex items-center gap-xs group">
                          <span>{row.user_id}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(String(row.user_id));
                              setMsg(`Copied User ID: ${row.user_id}`);
                              setTimeout(() => setMsg(''), 2000);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-[2px] hover:bg-surface-container-high rounded text-outline hover:text-primary cursor-pointer flex items-center justify-center"
                            title="Copy User ID"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-md font-bold text-on-surface">{row.name}</td>
                      <td className="p-md">{row.age}</td>
                      <td className="p-md">
                        <span className="px-xs py-[2px] bg-primary/20 text-primary text-[11px] font-bold rounded">
                          {row.primary_category}
                        </span>
                      </td>
                      <td className="p-md text-outline">{row.notification_tag}</td>
                      <td className="p-md text-right text-secondary">{row.content_score}</td>
                      <td className="p-md text-right text-tertiary">{row.scheme_score}</td>
                      <td className="p-md text-right text-primary">{row.job_score}</td>
                      <td className="p-md text-right text-green-500">{row.service_score}</td>
                      <td className="p-md text-right font-mono-code">{row.engagement_time_min}</td>
                      <td className="p-md text-right">{row.notification_click}</td>
                      <td className="p-md uppercase font-semibold">{row.preferred_language || 'en'}</td>
                      <td className="p-md">{row.mobile_no}</td>
                      <td className="p-md">{row.bpl_category}</td>
                      <td className="p-md text-right">₹{parseFloat(row.personal_income || "0").toLocaleString()}</td>
                      <td className="p-md text-right">₹{parseFloat(row.family_income || "0").toLocaleString()}</td>
                      <td className="p-md">{row.family_type_id}</td>
                      <td className="p-md">{row.Occupation}</td>
                      <td className="p-md">{row.Working_status}</td>
                      <td className="p-md">{row.district}</td>
                      <td className="p-md">{row.pincode}</td>
                      <td className="p-md">{row.house_ownership}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'runs' ? (
        /* Saved Runs list view */
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden p-md space-y-md">
          {savedRuns.length === 0 ? (
            <div className="text-center p-xl text-outline font-bold">
              No saved scoring tables yet. Upload clicks CSV in Notification Generator to calculate and save.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {savedRuns.map((run) => (
                <div key={run.id} className="py-md flex justify-between items-center flex-wrap gap-md">
                  <div>
                    <h3 className="font-bold text-on-surface text-body-md">
                      📅 Saved Scoring Run: {run.timestamp}
                    </h3>
                    <p className="text-[12px] text-outline">
                      {run.data?.length || 0} citizen rows computed
                    </p>
                  </div>
                  <div className="flex gap-sm">
                    <button
                      onClick={() => setSelectedRun(run)}
                      className="px-md py-xs bg-primary text-on-primary font-bold text-body-sm rounded hover:opacity-90 cursor-pointer"
                    >
                      👁 View Table
                    </button>
                    <button
                      onClick={() => handleDeleteRun(run.id)}
                      className="px-md py-xs bg-error text-on-error font-bold text-body-sm rounded hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: '#c62828', color: '#ffffff' }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'saved_generations' ? (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant">
                <th className="p-md font-label-md text-outline uppercase font-bold">Name</th>
                <th className="p-md font-label-md text-outline uppercase font-bold">User ID</th>
                <th className="p-md font-label-md text-outline uppercase font-bold">Age</th>
                <th className="p-md font-label-md text-outline uppercase font-bold">Generated Notifications</th>
                <th className="p-md font-label-md text-outline uppercase font-bold">Status</th>
                <th className="p-md font-label-md text-outline uppercase font-bold">View</th>
                <th className="p-md font-label-md text-outline uppercase font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {savedGens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-xl text-center text-outline font-medium">
                    No saved generations found. Go to Notification Generator to create and save drafts.
                  </td>
                </tr>
              ) : (
                savedGens.map((gen: any) => (
                  <tr key={gen.user_id} className="hover:bg-surface-container-high/50 transition-colors">
                    <td className="p-md font-bold text-on-surface">{gen.name}</td>
                    <td className="p-md text-[11px] text-outline font-mono-code">{gen.user_id}</td>
                    <td className="p-md text-on-surface-variant font-medium">{gen.age || 'N/A'}</td>
                    <td className="p-md text-on-surface-variant font-medium">{gen.notifications_count}</td>
                    <td className="p-md">
                      {gen.status === 'SAVED' && (
                        <span className="px-sm py-xs bg-surface-container-low border border-outline-variant text-[11px] font-bold rounded uppercase text-on-surface">
                          SAVED DRAFT
                        </span>
                      )}
                      {gen.status === 'PENDING_REVIEW' && (
                        <span className="px-sm py-xs bg-secondary/20 text-secondary border border-secondary/30 text-[11px] font-bold rounded uppercase">
                          PENDING
                        </span>
                      )}
                      {gen.status === 'FLAGGED' && (
                        <span className="px-sm py-xs bg-error/20 text-error border border-error/30 text-[11px] font-bold rounded uppercase flex items-center gap-xs w-max">
                          <span className="material-symbols-outlined text-[14px]">flag</span>
                          FLAGGED BY ADMIN
                        </span>
                      )}
                    </td>
                    <td className="p-md">
                      <button
                        onClick={() => setViewNotifsModal(gen.notifications)}
                        className="text-primary font-label-sm font-bold uppercase hover:underline cursor-pointer"
                      >
                        View Notifs
                      </button>
                    </td>
                    <td className="p-md text-right">
                      <div className="flex items-center justify-end gap-sm">
                        {gen.status === 'SAVED' ? (
                          <button
                            onClick={() => handleSendToReview(gen.user_id)}
                            className="bg-primary text-on-primary px-md py-sm rounded text-[12px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">send</span>
                            Send to Admin
                          </button>
                        ) : (
                          <span className="text-outline text-[12px] font-bold italic">
                            Already Sent
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteDrafts(gen.user_id)}
                          title="Delete generated notifications"
                          className="bg-error/10 text-error hover:bg-error/20 p-sm rounded-lg transition-all flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* View Notifications Modal */}
      {viewNotifsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim/60 backdrop-blur-sm p-md">
          <div className="bg-surface-container w-full max-w-4xl min-w-[300px] rounded-xl border border-outline-variant shadow-xl flex flex-col max-h-[85vh]">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">preview</span>
                Preview Generated Notifications
              </h2>
              <button onClick={() => setViewNotifsModal(null)} className="text-outline hover:text-on-surface cursor-pointer p-xs rounded hover:bg-outline-variant/20 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-md overflow-y-auto space-y-lg custom-scrollbar">
              {viewNotifsModal.map((notif: any, idx: number) => {
                let parsed: any = {};
                try {
                  const content = notif.personalized_content || "{}";
                  parsed = typeof content === 'string' && content.trim().startsWith('{') ? JSON.parse(content) : { message: content };
                } catch (e) {
                  parsed = { message: notif.personalized_content || notif.description };
                }
                
                return (
                  <div key={notif.id} className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-md shadow-sm">
                    <div className="flex justify-between items-start gap-md border-b border-outline-variant/50 pb-sm">
                      <h3 className="font-headline-sm text-primary font-bold">
                        {idx + 1}. {parsed.title || notif.title}
                      </h3>
                      <span className="px-sm py-xs bg-primary-container text-on-primary-container text-[11px] uppercase font-bold rounded">
                        {notif.category}
                      </span>
                    </div>
                    
                    <div className="space-y-sm">
                      <div className="bg-surface border border-outline-variant/30 rounded p-md">
                        <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                          {parsed.message || parsed.personalized_content || notif.personalized_content || notif.description}
                        </p>
                      </div>
                    </div>

                    {parsed.why_bullets && Array.isArray(parsed.why_bullets) && parsed.why_bullets.length > 0 && (
                      <div className="bg-surface-container-high p-md rounded-lg border border-outline-variant/50 space-y-xs">
                        <h5 className="font-label-sm text-label-sm text-outline uppercase font-bold">
                          Why this notification?
                        </h5>
                        <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-xs pl-xs">
                          {parsed.why_bullets.map((bullet: string, bIdx: number) => (
                            <li key={bIdx} className="leading-relaxed">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-md border-t border-outline-variant bg-surface-container-high flex justify-end">
              <button 
                onClick={() => setViewNotifsModal(null)}
                className="px-xl py-sm bg-primary text-on-primary font-bold rounded font-label-md hover:opacity-90 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

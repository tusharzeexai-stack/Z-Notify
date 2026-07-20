import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getScoringRuns } from '../utils/scoringStorage';
import { getActionLinks } from '../utils/actionLinks';

export const GeneratedNotifications: React.FC = () => {
  const { fetchSavedGenerations, sendToReview, deleteSavedGenerations, jobs, schemes, services, medicalFacilities, fetchInventories } = useDashboard();
  const [msg, setMsg] = useState('');
  const [savedGens, setSavedGens] = useState<any[]>([]);
  const [viewNotifsModal, setViewNotifsModal] = useState<any | null>(null);
  const [savedRuns, setSavedRuns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'user' | 'cohort'>('user');
  const [cohortGens, setCohortGens] = useState<any[]>([]);
  const [expandedCohort, setExpandedCohort] = useState<string | null>(null);

  const cleanCode = (val: any, type: 'marital' | 'education' | 'house' | 'caste'): string => {
    if (!val) return 'N/A';
    const strVal = String(val).trim();
    let cleanId = strVal;
    if (strVal.includes('-')) {
      const parts = strVal.split('-');
      if (parts.length > 1) {
        cleanId = parts[1];
      }
    }

    if (type === 'marital') {
      const MAP: Record<string, string> = { "1": "Single", "2": "Married", "3": "Divorced", "4": "Widowed", "5": "Separated", "6": "Single", "7": "Single" };
      return MAP[cleanId] || strVal;
    }
    if (type === 'education') {
      const MAP: Record<string, string> = { "1": "Illiterate", "2": "Primary School", "3": "Literate", "4": "Middle School", "5": "High School", "6": "Higher Secondary", "7": "Diploma", "8": "Graduate", "9": "Post Graduate", "10": "Professional Degree", "11": "Other" };
      return MAP[cleanId] || strVal;
    }
    if (type === 'house') {
      const MAP: Record<string, string> = { "1": "Own House", "2": "Owned", "3": "Rented", "4": "Provided by Employer", "5": "Other" };
      return MAP[cleanId] || strVal;
    }
    if (type === 'caste') {
      const MAP: Record<string, string> = { "1": "General", "2": "OBC", "3": "SC", "4": "ST", "5": "NT", "6": "SBC", "7": "EWS" };
      return MAP[cleanId] || strVal;
    }
    return strVal;
  };

  const getUserScoringData = (uid: string) => {
    try {
      if (savedRuns && savedRuns.length > 0) {
        for (const run of savedRuns) {
          if (run && run.data) {
            const found = run.data.find((d: any) => String(d.user_id) === String(uid) || String(d.citizen_id) === String(uid));
            if (found) return found;
          }
        }
      }
    } catch (e) {
      console.error("Error parsing saved runs", e);
    }
    return null;
  };

  useEffect(() => {
    loadSavedGens();
    getScoringRuns().then(setSavedRuns).catch(console.error);
    fetchInventories();
    
    // Load cohort generations from localStorage
    const savedCohorts = JSON.parse(localStorage.getItem('hpns_saved_cohort_gens') || '[]');
    setCohortGens(savedCohorts);
  }, []);

  const loadSavedGens = async () => {
    const gens = await fetchSavedGenerations();
    setSavedGens(gens);
  };

  const handleDeleteCohortDraft = (cohortId: string, title: string) => {
    if (!window.confirm(`Delete this saved template?`)) return;
    const updated = cohortGens.filter(c => !(c.cohort_id === cohortId && c.notification_title_with_name === title));
    setCohortGens(updated);
    localStorage.setItem('hpns_saved_cohort_gens', JSON.stringify(updated));
    setMsg('Cohort template deleted.');
    setTimeout(() => setMsg(''), 4000);
  };

  const handleDeleteCohortGroup = (cohortId: string) => {
    if (!window.confirm(`Delete all saved templates for cohort ${cohortId}?`)) return;
    const updated = cohortGens.filter(c => c.cohort_id !== cohortId);
    setCohortGens(updated);
    localStorage.setItem('hpns_saved_cohort_gens', JSON.stringify(updated));
    setMsg('Cohort group deleted.');
    setTimeout(() => setMsg(''), 4000);
    if (expandedCohort === cohortId) setExpandedCohort(null);
  };

  // Group cohorts by cohort_id
  const groupedCohorts: Record<string, any[]> = cohortGens.reduce((acc: Record<string, any[]>, curr: any) => {
    if (!acc[curr.cohort_id]) acc[curr.cohort_id] = [];
    acc[curr.cohort_id].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

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

  return (
    <div className="p-xl space-y-lg max-w-[1400px] mx-auto animate-fade-in relative pb-32">
      {msg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-surface text-on-surface border border-outline px-xl py-sm rounded-lg shadow-lg z-50 animate-slide-up font-bold">
          {msg}
        </div>
      )}

      <div>
        <h1 className="text-display-sm font-bold text-primary mb-xs">Generated Notifications</h1>
        <p className="text-on-surface-variant font-body-lg">
          Review, approve, and manage AI-generated notification drafts before they are sent to the review queue.
        </p>
      </div>

      <div className="inline-flex bg-surface-container border border-outline-variant rounded-lg p-xs gap-xs mb-sm">
        <button
          onClick={() => setActiveTab('user')}
          className={`py-sm px-lg rounded-md text-[14px] font-bold cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'user' ? 'bg-primary text-on-primary shadow-sm' : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          User-Wise Notifications
        </button>
        <button
          onClick={() => setActiveTab('cohort')}
          className={`py-sm px-lg rounded-md text-[14px] font-bold cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'cohort' ? 'bg-primary text-on-primary shadow-sm' : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Cohort-Wise Notifications
        </button>
      </div>

      {activeTab === 'user' ? (
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-sm">
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
                      onClick={() => setViewNotifsModal(gen)}
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
      ) : (
        <div className="space-y-md">
          {Object.keys(groupedCohorts).length === 0 ? (
            <div className="p-xl text-center text-outline font-medium bg-surface-container border border-outline-variant rounded-xl shadow-sm">
              No saved cohort generations found. Go to Notification Generator to create and save cohort drafts.
            </div>
          ) : (
            <div className="space-y-md">
              {Object.entries(groupedCohorts).map(([cohortId, notifs]) => {
                const isExpanded = expandedCohort === cohortId;
                const b = cohortId.split('-')[0] || '';
                const B_COLORS: Record<string,string> = {
                  B1:'bg-blue-500/15 text-blue-400 border-blue-500/30', B3:'bg-amber-500/15 text-amber-400 border-amber-500/30',
                  B4:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', B5:'bg-pink-500/15 text-pink-400 border-pink-500/30'
                };
                const badgeClass = B_COLORS[b] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

                return (
                  <div key={cohortId} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                    {/* Header */}
                    <div 
                      className={`p-md flex justify-between items-center cursor-pointer hover:bg-surface-container-high transition-colors ${isExpanded ? 'bg-surface-container-high border-b border-outline-variant/50' : 'bg-surface-container'}`}
                      onClick={() => setExpandedCohort(isExpanded ? null : cohortId)}
                    >
                      <div className="flex items-center gap-md">
                        <span className="material-symbols-outlined text-primary bg-primary/10 rounded-full p-xs">
                          {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-sm">
                            <h3 className="font-headline-sm font-bold text-on-surface">Cohort {cohortId}</h3>
                            <span className={`text-[10px] font-bold px-sm py-[2px] rounded border ${badgeClass}`}>
                              {notifs[0]?.cohort_name || 'Cohort'}
                            </span>
                          </div>
                          <p className="text-body-sm text-outline mt-xs">{notifs.length} Generated Templates</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCohortGroup(cohortId); }}
                        className="text-error hover:bg-error/10 p-sm rounded-lg transition-colors flex items-center shadow-sm border border-transparent hover:border-error/20"
                        title="Delete entire cohort group"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                      </button>
                    </div>

                    {/* Expanded Grid */}
                    {isExpanded && (
                      <div className="p-lg bg-surface-container-low/30 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg animate-fade-in">
                        {notifs.map((r: any, i: number) => (
                          <div key={i} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-md relative group flex flex-col">
                            <div className="bg-surface-container-high border-b border-outline-variant px-md py-sm flex justify-between items-center">
                              <span className={`text-[10px] font-bold px-xs py-[2px] rounded border ${badgeClass}`}>{r.cohort_id}</span>
                              <div className="flex gap-xs">
                                {r.eligibility_check_required && <span className="text-[9px] font-bold px-xs py-[1px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">LOCATION</span>}
                                {r.location_token_required && <span className="text-[9px] font-bold px-xs py-[1px] bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded">LOCATION</span>}
                                <span className="text-[9px] font-bold px-xs py-[1px] bg-secondary/20 text-secondary border border-secondary/30 rounded uppercase">{r.cadence_tier}</span>
                              </div>
                            </div>
                            <div className="p-md space-y-md flex-1 flex flex-col">
                              <div>
                                <p className="font-bold text-on-surface text-[14px] leading-snug mb-xs">{r.notification_title_with_name}</p>
                                <p className="text-on-surface-variant text-[13px] leading-relaxed">{r.notification_body_generic}</p>
                              </div>
                              {r.notification_body_templated && r.notification_body_templated !== r.notification_body_generic && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-sm mt-auto">
                                  <p className="text-[10px] font-bold text-primary uppercase mb-xs tracking-wider">Templated Variant</p>
                                  <p className="text-on-surface text-[12px]">{r.notification_body_templated}</p>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-sm border-t border-outline-variant/30 mt-auto">
                                <span className="text-[12px] font-bold px-md py-xs bg-primary/10 text-primary rounded-md shadow-sm cursor-pointer hover:bg-primary hover:text-on-primary transition-colors">{r.cta_label}</span>
                                {r.title_no_name_fallback && <span className="text-[11px] text-outline italic">Fallback: {r.title_no_name_fallback}</span>}
                              </div>
                              {r.reasoning_note && <p className="text-[11px] text-outline italic mt-xs">{r.reasoning_note}</p>}
                            </div>
                            <button 
                              onClick={() => handleDeleteCohortDraft(r.cohort_id, r.notification_title_with_name)}
                              className="absolute top-sm right-sm opacity-0 group-hover:opacity-100 bg-error/90 text-on-error p-xs rounded-md transition-all shadow-md cursor-pointer hover:bg-error"
                              title="Delete Single Draft"
                            >
                              <span className="material-symbols-outlined text-[16px] block">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View Notifications Modal */}
      {viewNotifsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim/60 backdrop-blur-sm p-md">
          <div className="bg-surface-container w-full max-w-5xl min-w-[300px] rounded-xl border border-outline-variant shadow-xl flex flex-col" style={{maxHeight: '90vh'}}>
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">preview</span>
                Preview Generated Notifications
              </h2>
              <button onClick={() => setViewNotifsModal(null)} className="text-outline hover:text-on-surface cursor-pointer p-xs rounded hover:bg-outline-variant/20 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body Grid */}
            {(() => {
              const scoringData = getUserScoringData(viewNotifsModal.user_id);
              return (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden" style={{minHeight: 0}}>
                  {/* Left Column: Notifications (width: 7/12) */}
                  <div className="lg:col-span-7 overflow-y-scroll space-y-md p-md" style={{scrollBehavior:'smooth', maxHeight:'100%'}}>
                    {(viewNotifsModal.notifications || []).map((notif: any, idx: number) => {
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

                          {/* Universal Action Links */}
                          {(() => {
                            const al = getActionLinks(notif, parsed, scoringData, { jobs, schemes, services, medicalFacilities });
                            const openUrl = (url: string | null | undefined) => {
                              if (!url) return;
                              window.open(url.startsWith('http') || url.startsWith('mailto') || url.startsWith('tel') ? url : `https://${url}`, '_blank');
                            };
                            return (
                              <div className="space-y-sm">
                                {al.items.length > 0 && (
                                  <>
                                    <h5 className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-xs">
                                      <span className="material-symbols-outlined text-[14px] text-primary">{al.icon}</span>
                                      {al.label} ({al.items.length})
                                    </h5>
                                    {al.items.map((it: any, ii: number) => (
                                      <div key={ii} className="bg-surface border border-outline-variant rounded-lg p-md space-y-xs hover:border-primary/50 transition-colors">
                                        <div className="flex justify-between items-start gap-xs">
                                          <div>
                                            <p className="font-bold text-on-surface text-[13px]">{it.title}</p>
                                            {it.sub && <p className="text-outline text-[11px] font-semibold">{it.sub}</p>}
                                          </div>
                                          <span className="text-[9px] font-bold px-xs py-[1px] bg-primary/10 text-primary border border-primary/20 rounded uppercase whitespace-nowrap">{it.badge}</span>
                                        </div>
                                        {it.meta?.length > 0 && (
                                          <div className="flex flex-wrap gap-xs text-[11px] text-outline">
                                            {it.meta.map((m: string, mi: number) => <span key={mi}>{m}</span>)}
                                          </div>
                                        )}
                                        <button onClick={() => openUrl(it.url || al.fallbacks[0]?.url)}
                                          className="w-full mt-xs bg-primary text-on-primary text-[12px] font-bold py-xs rounded-md hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-xs">
                                          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                          {it.btnLabel}
                                        </button>
                                      </div>
                                    ))}
                                  </>
                                )}
                                {al.items.length === 0 && (
                                  <>
                                    <p className="text-amber-400 text-[12px] font-bold flex items-center gap-xs">
                                      <span className="material-symbols-outlined text-[16px]">info</span>
                                      Direct Application & Portal Links:
                                    </p>
                                    <div className="flex flex-col gap-sm">
                                      {al.fallbacks.map((fb: any, fi: number) => (
                                        <button key={fi} onClick={() => openUrl(fb.url)}
                                          className={`w-full text-[12px] font-bold py-sm rounded-lg flex items-center justify-center gap-xs hover:opacity-90 transition-all cursor-pointer ${fb.color}`}>
                                          <span className="material-symbols-outlined text-[15px]">{al.icon}</span>
                                          {fb.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}

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

                  {/* Right Column: User Scoring Sidebar (width: 5/12) */}
                  <div className="lg:col-span-5 bg-surface-container-high/60 border-l border-outline-variant p-lg space-y-lg overflow-y-scroll" style={{scrollBehavior:'smooth', maxHeight:'100%'}}>
                    {/* Demographic Profile */}
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                        <span className="material-symbols-outlined">account_circle</span>
                        <span>Demographic Profile</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-sm text-body-sm">
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Gender</p>
                          <p className="text-on-surface font-semibold">{viewNotifsModal.gender || 'N/A'}</p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Marital Status</p>
                          <p className="text-on-surface font-semibold">{cleanCode(viewNotifsModal.marital_status, 'marital')}</p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">State / District</p>
                          <p className="text-on-surface font-semibold">
                            {viewNotifsModal.state || 'N/A'} / {viewNotifsModal.district || 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Pincode</p>
                          <p className="text-on-surface font-semibold">{viewNotifsModal.pincode || 'N/A'}</p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Education</p>
                          <p className="text-on-surface font-semibold">{cleanCode(viewNotifsModal.education, 'education')}</p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Occupation</p>
                          <p className="text-on-surface font-semibold">{viewNotifsModal.occupation || 'N/A'}</p>
                        </div>
                        <div className="space-y-xs col-span-2">
                          <p className="text-outline uppercase text-[10px] font-bold">Income (Annual)</p>
                          <p className="text-on-surface font-semibold">
                            {viewNotifsModal.income ? `₹${viewNotifsModal.income.toLocaleString()}` : 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Caste Category</p>
                          <p className="text-on-surface font-semibold">{cleanCode(viewNotifsModal.caste_category, 'caste')}</p>
                        </div>
                        <div className="space-y-xs">
                          <p className="text-outline uppercase text-[10px] font-bold">Disability Status</p>
                          <p className="text-on-surface font-semibold">{viewNotifsModal.disability_status || 'None'}</p>
                        </div>
                      </div>
                    </div>

                    <hr className="border-outline-variant/30" />

                    {/* Scoring metrics & engagement details */}
                    {scoringData ? (
                      <div className="space-y-lg">
                        <div className="space-y-sm">
                          <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Scoring Run Metrics</h3>
                          <div className="grid grid-cols-2 gap-sm text-body-sm">
                            <div className="space-y-xs">
                              <p className="text-outline uppercase text-[10px] font-bold">Primary Category</p>
                              <span className="inline-block px-sm py-[2px] bg-primary/20 text-primary text-[11px] font-bold rounded">
                                {scoringData.primary_category || 'N/A'}
                              </span>
                            </div>
                            <div className="space-y-xs">
                              <p className="text-outline uppercase text-[10px] font-bold">Notification Tag</p>
                              <p className="text-on-surface font-semibold">{scoringData.notification_tag || 'N/A'}</p>
                            </div>
                            <div className="space-y-xs">
                              <p className="text-outline uppercase text-[10px] font-bold">BPL Category</p>
                              <p className="text-on-surface font-semibold">{scoringData.bpl_category || 'N/A'}</p>
                            </div>
                            <div className="space-y-xs">
                              <p className="text-outline uppercase text-[10px] font-bold">House Ownership</p>
                              <p className="text-on-surface font-semibold">{cleanCode(viewNotifsModal.house_ownership, 'house')}</p>
                            </div>
                          </div>
                        </div>

                        <hr className="border-outline-variant/30" />

                        <div className="space-y-sm">
                          <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Scoring Vectors</h3>
                          <div className="grid grid-cols-2 gap-md">
                            <div className="bg-surface-container border border-outline-variant p-sm rounded-lg">
                              <p className="text-[10px] text-outline uppercase font-bold mb-xs">Content Score</p>
                              <p className="text-headline-sm font-bold text-secondary font-mono-code">{scoringData.content_score || 0}</p>
                            </div>
                            <div className="bg-surface-container border border-outline-variant p-sm rounded-lg">
                              <p className="text-[10px] text-outline uppercase font-bold mb-xs">Scheme Score</p>
                              <p className="text-headline-sm font-bold text-tertiary font-mono-code">{scoringData.scheme_score || 0}</p>
                            </div>
                            <div className="bg-surface-container border border-outline-variant p-sm rounded-lg">
                              <p className="text-[10px] text-outline uppercase font-bold mb-xs">Job Score</p>
                              <p className="text-headline-sm font-bold text-primary font-mono-code">{scoringData.job_score || 0}</p>
                            </div>
                            <div className="bg-surface-container border border-outline-variant p-sm rounded-lg">
                              <p className="text-[10px] text-outline uppercase font-bold mb-xs">Service Score</p>
                              <p className="text-headline-sm font-bold text-green-500 font-mono-code">{scoringData.service_score || 0}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface-container-low border border-outline-variant p-md rounded-lg text-center">
                        <span className="material-symbols-outlined text-outline text-[32px] mb-xs">info</span>
                        <p className="text-body-sm text-outline">No scoring run metrics associated with this user generation.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

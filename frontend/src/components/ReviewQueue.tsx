import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getScoringRuns } from '../utils/scoringStorage';

export const ReviewQueue: React.FC = () => {
  const { reviews, fetchReviews, fetchUsers, approveNotification, rejectNotification, flagNotification, users } = useDashboard();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [flagRisk, setFlagRisk] = useState('medium');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scoringRuns, setScoringRuns] = useState<any[]>([]);

  useEffect(() => {
    fetchReviews();
    fetchUsers();
    getScoringRuns().then(runs => setScoringRuns(runs)).catch(console.error);
  }, []);

  const pendingItems = reviews.filter((item) => item.status === 'PENDING_REVIEW');

  const [localApprovedIds, setLocalApprovedIds] = useState<string[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  useEffect(() => {
    setLocalApprovedIds([]);
    setSelectedEmployeeId('');
  }, [selectedUserId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = (id: string) => {
    if (localApprovedIds.includes(id)) {
      setLocalApprovedIds(prev => prev.filter(item => item !== id));
    } else {
      setLocalApprovedIds(prev => [...prev, id]);
    }
  };

  const handleBulkSend = async () => {
    if (localApprovedIds.length === 0 || !selectedEmployeeId) return;
    setSendingBulk(true);
    try {
      const results = await Promise.all(
        localApprovedIds.map(id => approveNotification(id, "Approved by admin review.", selectedEmployeeId))
      );
      const successCount = results.filter(Boolean).length;
      showToast(`Successfully sent ${successCount} notification(s) to Employee Inbox.`);
      setLocalApprovedIds([]);
      setSelectedEmployeeId('');
      fetchReviews();
    } catch (error) {
      console.error("Error bulk sending reviews:", error);
      showToast("Error processing bulk approval.");
    } finally {
      setSendingBulk(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    const item = reviews.find((r) => r.notification_id === rejectingId);
    const ok = await rejectNotification(rejectingId, comment);
    if (ok) {
      showToast(`Rejected recommendation: "${item?.notification.title}"`);
      setLocalApprovedIds(prev => prev.filter(id => id !== rejectingId));
    }
    setRejectingId(null);
    setComment('');
  };

  const handleConfirmFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingId) return;
    const item = reviews.find((r) => r.notification_id === flaggingId);
    const ok = await flagNotification(flaggingId, comment, flagRisk);
    if (ok) {
      showToast(`Flagged recommendation: "${item?.notification.title}"`);
      setLocalApprovedIds(prev => prev.filter(id => id !== flaggingId));
    }
    setFlaggingId(null);
    setComment('');
  };

  const employees = users.filter((u) => u.role === 'employee');

  // Group pending reviews by user_id
  const userPendingMap = pendingItems.reduce((acc, item) => {
    const uId = item.notification.user_id;
    if (!acc[uId]) {
      acc[uId] = [];
    }
    acc[uId].push(item);
    return acc;
  }, {} as Record<string, typeof pendingItems>);

  const pendingUserIds = Object.keys(userPendingMap);

  const pendingUsers = pendingUserIds.map((uId) => {
    const user = users.find((u) => u.id === uId);
    return {
      id: uId,
      name: user?.name || `Citizen ${uId.substring(0, 8)}`,
      age: user?.age || 'N/A',
      count: userPendingMap[uId].length,
    };
  });

  const selectedUserPendingItems = selectedUserId ? pendingItems.filter(item => item.notification.user_id === selectedUserId) : [];

  const getUserScoringData = (uid: string) => {
    try {
      if (scoringRuns && scoringRuns.length > 0) {
        for (const run of scoringRuns) {
          const found = run.data.find((d: any) => d.user_id === uid || String(d.citizen_id) === uid);
          if (found) return found;
        }
      }
    } catch (e) {
      console.error("Error parsing saved runs in ReviewQueue", e);
    }
    return null;
  };

  const user = users.find(u => u.id === selectedUserId);
  const scoringData = selectedUserId ? getUserScoringData(selectedUserId) : null;

  return (
    <div className="space-y-xl">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 border border-primary px-lg py-md rounded-lg shadow-2xl flex items-center gap-md animate-bounce"
          style={{ backgroundColor: 'var(--th-surface)' }}
        >
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <span className="text-body-sm text-on-background font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Flag Dialog Modal */}
      {flaggingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-md">
          <div className="bg-surface-container border border-outline-variant p-lg rounded-xl max-w-[480px] w-full space-y-md">
            <h3 className="font-headline-md text-headline-md text-primary">Flag Notification</h3>
            <p className="text-body-sm text-outline">
              Specify policy risk or safety alerts context before flagging this notification.
            </p>
            <form onSubmit={handleConfirmFlag} className="space-y-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Reason for Flag</label>
                <textarea
                  className="bg-surface-container-low border border-outline-variant text-on-surface p-md font-body-sm w-full focus:outline-none focus:border-primary input-glow rounded resize-none"
                  placeholder="Describe compliance or quality issues..."
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Risk Level</label>
                <select
                  className="bg-surface-container-low border border-outline-variant text-on-surface p-md font-body-sm w-full focus:outline-none"
                  value={flagRisk}
                  onChange={(e) => setFlagRisk(e.target.value)}
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>
              </div>

              <div className="flex gap-md justify-end pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setFlaggingId(null)}
                  className="px-md py-sm border border-outline-variant text-on-surface hover:bg-surface-variant text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-error text-on-error hover:opacity-90 text-label-md font-bold rounded"
                >
                  Flag Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Dialog Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-md">
          <div className="bg-surface-container border border-outline-variant p-lg rounded-xl max-w-[480px] w-full space-y-md">
            <h3 className="font-headline-md text-headline-md text-primary">Reject Notification</h3>
            <p className="text-body-sm text-outline">
              Specify rejection reason. Rejected alerts are archived and not delivered.
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Rejection Reason</label>
                <textarea
                  className="bg-surface-container-low border border-outline-variant text-on-surface p-md font-body-sm w-full focus:outline-none focus:border-primary input-glow rounded resize-none"
                  placeholder="Explain why this profile match is incorrect..."
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex gap-md justify-end pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-md py-sm border border-outline-variant text-on-surface hover:bg-surface-variant text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-error text-on-error hover:opacity-90 text-label-md font-bold rounded"
                >
                  Reject Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Review Queue</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Inspect recommended matches, personalized AI summaries, and approve for SMS/FCM distribution.
          </p>
        </div>
        <div className="bg-surface-container-high px-md py-sm border border-outline-variant rounded flex items-center gap-md">
          <span className="text-on-surface-variant font-label-md text-label-md">
            {selectedUserId ? 'Pending Reviews for Citizen:' : 'Pending Citizens:'}
          </span>
          <span className="text-primary font-bold font-headline-md text-headline-md">
            {selectedUserId ? selectedUserPendingItems.length : pendingUserIds.length}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="space-y-gutter">
        {pendingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-2xl border border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl">
            <span className="material-symbols-outlined text-[64px] text-outline mb-md">check_circle</span>
            <p className="text-on-surface font-headline-md">Review Queue is Empty</p>
            <p className="text-outline-variant font-body-sm mt-xs">All eligibility recommendations have been resolved.</p>
          </div>
        ) : selectedUserId ? (
          /* Selected citizen's pending reviews */
          <div className="space-y-gutter">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md mb-md">
              <div className="flex items-center gap-md">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="flex items-center gap-xs px-md py-sm border border-outline-variant text-on-surface hover:bg-surface-variant font-label-md rounded-lg transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Back to Citizens</span>
                </button>
                <div>
                  <h2 className="font-headline-md text-on-surface font-bold">
                    {(() => {
                      const user = users.find(u => u.id === selectedUserId);
                      return user?.name || `Citizen ${selectedUserId.substring(0, 8)}`;
                    })()}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    Age: {users.find(u => u.id === selectedUserId)?.age || 'N/A'} • ID: {selectedUserId}
                  </p>
                </div>
              </div>
            </div>

            {selectedUserPendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-2xl border border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl">
                <span className="material-symbols-outlined text-[64px] text-primary mb-md">check_circle</span>
                <p className="text-on-surface font-headline-md">All notifications reviewed for this citizen!</p>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="mt-md bg-primary text-on-primary hover:opacity-90 px-lg py-sm font-label-md rounded-lg transition-all flex items-center gap-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Return to Citizens Queue</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-lg items-start">
                {/* Left Column: Notifications list */}
                <div className="xl:col-span-8 space-y-gutter">
                  {selectedUserPendingItems.map((item) => {
                    const user = users.find(u => u.id === item.notification.user_id);
                    const userName = user?.name || `Citizen ${item.notification.user_id.substring(0, 5)}`;
                    const userAge = user?.age || 'N/A';

                    return (
                      <section
                        key={item.id}
                        className="bg-surface-container-low border border-outline-variant rounded overflow-hidden flex flex-col sm:flex-row card-hover transition-all duration-300"
                      >
                        <div
                          className={`w-2 flex-shrink-0 ${
                            item.notification.priority === 'critical' ? 'bg-error' : item.notification.priority === 'high' ? 'bg-primary' : 'bg-yellow-500'
                          }`}
                        />
                        <div className="p-lg flex-1 space-y-md">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-sm">
                            <div>
                              <h3 className="font-headline-md text-on-surface font-bold flex items-center gap-xs">
                                <span>{item.notification.title}</span>
                                {item.notification.is_updated && (
                                  <span className="inline-flex items-center gap-xs px-sm py-0.5 text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 font-bold rounded uppercase tracking-wider animate-pulse">
                                    <span className="material-symbols-outlined text-[12px]">published_with_changes</span>
                                    UPDATED
                                  </span>
                                )}
                              </h3>
                              <div className="flex gap-xs items-center flex-wrap mt-xs">
                                <span className="px-sm py-0.5 text-[10px] bg-primary/20 text-primary font-bold rounded uppercase">
                                  Score: {item.notification.eligibility_score}%
                                </span>
                                <span className="px-sm py-0.5 text-[10px] bg-secondary/20 text-secondary font-bold rounded uppercase flex items-center gap-xs">
                                  <span className="material-symbols-outlined text-[12px]">person</span>
                                  {userName} (Age: {userAge})
                                </span>
                                <span className="text-outline text-[11px] font-mono-code">UUID: {item.notification.id}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-on-surface-variant text-[11px] uppercase font-bold">Match Reason</p>
                              <p className="text-on-surface text-[12px] font-semibold max-w-xs truncate">{item.notification.reason_for_match}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg border-t border-outline-variant/50 pt-md">
                            <div>
                              <h4 className="text-outline font-label-sm text-[11px] uppercase mb-xs font-bold">Personalized summary (AI)</h4>
                              <div className="bg-surface-container-low p-md border border-outline-variant text-body-sm text-on-surface rounded min-h-[100px] space-y-md shadow-sm">
                                {(() => {
                                  const content = item.notification.personalized_content;
                                  if (!content) return <span className="italic">No AI Personalization generated.</span>;
                                  
                                  let parsed: any = {};
                                  try {
                                    parsed = typeof content === 'string' && content.trim().startsWith('{') ? JSON.parse(content) : { message: content };
                                  } catch (e) {
                                    parsed = { message: content };
                                  }

                                  return (
                                    <div className="space-y-sm">
                                      {parsed.title && <h5 className="font-headline-sm font-bold text-primary">{parsed.title}</h5>}
                                      <p className="leading-relaxed whitespace-pre-wrap">
                                        {parsed.message || parsed.personalized_content || content}
                                      </p>
                                      {parsed.why_bullets && Array.isArray(parsed.why_bullets) && parsed.why_bullets.length > 0 && (
                                        <div className="mt-sm pt-sm border-t border-outline-variant/30 space-y-xs">
                                          <span className="font-label-sm text-[11px] uppercase font-bold text-outline">Why this matches:</span>
                                          <ul className="list-disc list-inside text-on-surface-variant text-body-sm pl-xs space-y-xs">
                                            {parsed.why_bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-outline font-label-sm text-[11px] uppercase mb-xs font-bold">Raw matches description</h4>
                              <div className="bg-surface-dim/55 p-sm border border-outline-variant text-[12px] text-on-surface-variant font-mono-code rounded min-h-[100px] whitespace-pre-line">
                                {item.notification.raw_content}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                            <button
                              type="button"
                              onClick={() => setFlaggingId(item.notification_id)}
                              className="flex items-center gap-xs px-lg py-sm border border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-label-md text-label-md uppercase tracking-wider rounded cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">flag</span> Flag
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingId(item.notification_id)}
                              className="flex items-center gap-xs px-lg py-sm border border-error text-error hover:bg-error/10 font-label-md text-label-md uppercase tracking-wider rounded cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span> Reject
                            </button>
                            {localApprovedIds.includes(item.notification_id) ? (
                              <button
                                type="button"
                                onClick={() => handleApprove(item.notification_id)}
                                className="flex items-center gap-xs px-lg py-sm bg-green-600 text-white hover:bg-green-700 font-label-md text-label-md uppercase tracking-wider rounded cursor-pointer transition-all duration-300"
                              >
                                <span className="material-symbols-outlined text-[18px]">check_circle</span> Approved
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApprove(item.notification_id)}
                                className="flex items-center gap-xs px-lg py-sm bg-primary text-on-primary hover:opacity-90 font-label-md text-label-md uppercase tracking-wider rounded cursor-pointer transition-all duration-300"
                              >
                                <span className="material-symbols-outlined text-[18px]">check</span> Approve
                              </button>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}

                  {localApprovedIds.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-md pt-md pb-lg border-t border-outline-variant/30 mt-md">
                      <div className="flex items-center gap-xs w-full sm:w-auto">
                        <label className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                          Assign to Employee:
                        </label>
                        <select
                          className="bg-surface-container-high border border-outline-variant text-on-surface px-md py-sm font-label-md text-label-md rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer w-full sm:w-64"
                          value={selectedEmployeeId}
                          onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                          <option value="">-- Select Employee --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleBulkSend}
                        disabled={sendingBulk || !selectedEmployeeId}
                        className="px-2xl py-md bg-green-600 hover:bg-green-700 text-white font-bold text-[14px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-sm shadow-lg hover:shadow-green-950/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                      >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                        <span>{sendingBulk ? 'SENDING...' : `SEND ${localApprovedIds.length} APPROVED NOTIFICATION${localApprovedIds.length > 1 ? 'S' : ''}`}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: User Metadata Sidebar */}
                <div className="xl:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-lg space-y-lg xl:sticky xl:top-20">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-bold mb-md flex items-center gap-xs">
                      <span className="material-symbols-outlined">account_circle</span>
                      <span>Demographic Profile</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-sm text-body-sm">
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Gender</p>
                        <p className="text-on-surface font-semibold">{user?.gender || scoringData?.gender || 'N/A'}</p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Marital Status</p>
                        <p className="text-on-surface font-semibold">{user?.marital_status || scoringData?.marital_status || 'N/A'}</p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">State / District</p>
                        <p className="text-on-surface font-semibold">
                          {user?.state || scoringData?.state || 'N/A'} / {user?.district || scoringData?.district || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Pincode</p>
                        <p className="text-on-surface font-semibold">{user?.pincode || scoringData?.pincode || 'N/A'}</p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Education</p>
                        <p className="text-on-surface font-semibold">{user?.education || scoringData?.education || 'N/A'}</p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Occupation</p>
                        <p className="text-on-surface font-semibold">{user?.occupation || scoringData?.Occupation || scoringData?.occupation || 'N/A'}</p>
                      </div>
                      <div className="space-y-xs col-span-2">
                        <p className="text-outline uppercase text-[10px] font-bold">Income (Annual)</p>
                        <p className="text-on-surface font-semibold">
                          {user?.income ? `₹${user.income.toLocaleString()}` : scoringData?.personal_income ? `₹${parseFloat(scoringData.personal_income).toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Caste Category</p>
                        <p className="text-on-surface font-semibold">{user?.caste_category || scoringData?.caste_category || 'N/A'}</p>
                      </div>
                      <div className="space-y-xs">
                        <p className="text-outline uppercase text-[10px] font-bold">Disability Status</p>
                        <p className="text-on-surface font-semibold">{user?.disability_status || scoringData?.disability_status || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-outline-variant/30" />

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
                            <p className="text-on-surface font-semibold">{scoringData.house_ownership || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-sm">
                        <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Engagement Scores</h3>
                        <div className="space-y-xs">
                          <div>
                            <div className="flex justify-between text-body-sm text-on-surface-variant mb-1">
                              <span>Content Score</span>
                              <span className="font-semibold text-secondary">{scoringData.content_score || 0}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container-high border border-outline-variant/50 rounded-full overflow-hidden">
                              <div className="h-full bg-secondary" style={{ width: `${Math.min(parseFloat(scoringData.content_score) || 0, 100)}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-body-sm text-on-surface-variant mb-1">
                              <span>Scheme Score</span>
                              <span className="font-semibold text-tertiary">{scoringData.scheme_score || 0}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container-high border border-outline-variant/50 rounded-full overflow-hidden">
                              <div className="h-full bg-tertiary" style={{ width: `${Math.min(parseFloat(scoringData.scheme_score) || 0, 100)}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-body-sm text-on-surface-variant mb-1">
                              <span>Job Score</span>
                              <span className="font-semibold text-primary">{scoringData.job_score || 0}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container-high border border-outline-variant/50 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${Math.min(parseFloat(scoringData.job_score) || 0, 100)}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-body-sm text-on-surface-variant mb-1">
                              <span>Service Score</span>
                              <span className="font-semibold text-green-500">{scoringData.service_score || 0}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container-high border border-outline-variant/50 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${Math.min(parseFloat(scoringData.service_score) || 0, 100)}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-sm">
                        <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Engagement Details</h3>
                        <div className="grid grid-cols-2 gap-sm text-body-sm">
                          <div className="space-y-xs">
                            <p className="text-outline uppercase text-[10px] font-bold">Engagement Time</p>
                            <p className="text-on-surface font-semibold">{scoringData.engagement_time_min || 0} min</p>
                          </div>
                          <div className="space-y-xs">
                            <p className="text-outline uppercase text-[10px] font-bold">Notification Clicks</p>
                            <p className="text-on-surface font-semibold">{scoringData.notification_click || 0}</p>
                          </div>
                          <div className="space-y-xs col-span-2">
                            <p className="text-outline uppercase text-[10px] font-bold">Preferred Language</p>
                            <p className="text-on-surface font-semibold uppercase">{scoringData.preferred_language || 'EN'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-[12px] text-yellow-500 space-y-xs">
                      <p className="font-bold flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        No scoring metrics
                      </p>
                      <p className="leading-relaxed">
                        No active scoring run data found for this citizen in local storage. Scoring metrics will be visible once click data is uploaded in the Notification Generator.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Table listing citizens with pending notifications */
          <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high/40">
                    <th className="p-md md:p-lg font-label-md text-label-md text-outline uppercase tracking-wider">Citizen ID</th>
                    <th className="p-md md:p-lg font-label-md text-label-md text-outline uppercase tracking-wider">Name</th>
                    <th className="p-md md:p-lg font-label-md text-label-md text-outline uppercase tracking-wider">Age</th>
                    <th className="p-md md:p-lg font-label-md text-label-md text-outline uppercase tracking-wider text-center">Pending Notifications</th>
                    <th className="p-md md:p-lg font-label-md text-label-md text-outline uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {pendingUsers.map((pUser) => (
                    <tr key={pUser.id} className="hover:bg-surface-variant/10 transition-all duration-200">
                      <td className="p-md md:p-lg font-mono-code text-body-sm text-on-surface-variant select-all">
                        {pUser.id}
                      </td>
                      <td className="p-md md:p-lg font-body-md text-on-surface font-semibold">
                        {pUser.name}
                      </td>
                      <td className="p-md md:p-lg text-body-md text-on-surface">
                        {pUser.age}
                      </td>
                      <td className="p-md md:p-lg text-center">
                        <span className="inline-block px-md py-xs bg-primary/10 border border-primary/20 text-primary text-label-sm font-bold rounded-full">
                          {pUser.count}
                        </span>
                      </td>
                      <td className="p-md md:p-lg text-right">
                        <button
                          onClick={() => setSelectedUserId(pUser.id)}
                          className="bg-primary text-on-primary hover:opacity-90 px-md py-sm font-label-md rounded-lg transition-all inline-flex items-center gap-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { saveScoringRun } from '../utils/scoringStorage';
import { loadDistrictMap, resolveField } from '../utils/mappings';

export const NotificationGenerator: React.FC = () => {
  const { token, users, generateNotifications, fetchNotifications, saveDrafts, changeView } = useDashboard();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'generate' | 'dashboard' | 'scoring' | 'cohort'>('generate');

  // Cohort-wise generation state
  const [cohortGenMode, setCohortGenMode] = useState<'all' | 'single'>('all');
  const [cohortGenSingle, setCohortGenSingle] = useState('');
  const [cohortGenLoading, setCohortGenLoading] = useState(false);
  const [cohortGenResults, setCohortGenResults] = useState<any[]>([]);
  const [cohortGenError, setCohortGenError] = useState('');
  const [cohortGenLog, setCohortGenLog] = useState<string[]>([]);
  
  useEffect(() => {
    loadDistrictMap();
  }, []);
  
  // Gemini API Key from LocalStorage or Server env
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  // Input Type: 'single' (search) or 'comma' (bulk input of 5-10 UIDs)
  const [inputType, setInputType] = useState<'single' | 'comma'>('single');

  // Search & Batch Input Query
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Generation results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNotifs, setGeneratedNotifs] = useState<any[]>([]);
  const [generationTime, setGenerationTime] = useState<string>('');

  // Bulk Generator States (Dashboard tab)
  const [runningBulk, setRunningBulk] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  // Scoring tab states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [surveyFile, setSurveyFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scoredPreview, setScoredPreview] = useState<any[]>([]);
  const [scoringStats, setScoringStats] = useState<any>(null);

  // Filter users based on query
  const filteredUsers = searchQuery.trim() === '' || inputType === 'comma'
    ? []
    : users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.includes(searchQuery)
      ).slice(0, 5);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchQuery(`${user.name} (${user.id.substring(0, 8)})`);
    setShowDropdown(false);
    setGeneratedNotifs([]); // Reset previous runs
  };

  // Auto-fill helper to pull 5 citizen IDs from context
  const handleAutoFillSeedUsers = () => {
    const citizenUsers = users.filter(u => u.role === 'employee');
    if (citizenUsers.length === 0) return;
    
    // Pick 5 users
    const sample = citizenUsers.slice(0, 5).map(u => u.id);
    setSearchQuery(sample.join(', '));
    setGeneratedNotifs([]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString()} - ${now.toLocaleTimeString()}`;
    
    let targetUserIds: string[] = [];
    if (inputType === 'single') {
      if (selectedUser) {
        targetUserIds = [selectedUser.id];
      } else if (searchQuery.trim()) {
        targetUserIds = [searchQuery.trim()];
      }
    } else {
      targetUserIds = searchQuery.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    if (targetUserIds.length === 0) {
      setIsGenerating(false);
      alert("Please select a citizen or enter comma-separated User IDs.");
      return;
    }

    try {
      const allNewNotifs: any[] = [];
      
      for (const uid of targetUserIds) {
        // Find matching user object for metadata presentation
        const matched = users.find(u => u.id === uid || u.id.substring(0, 8) === uid);
        const actualUid = matched ? matched.id : uid;
        
        let userScores = null;
        let userData: any = { Name: matched ? matched.name : `Citizen ${actualUid.substring(0, 5)}`, Age: null };
        
        const savedRunsStr = localStorage.getItem('saved_scoring_runs');
        if (savedRunsStr) {
          try {
            const savedRuns = JSON.parse(savedRunsStr);
            if (savedRuns && savedRuns.length > 0) {
              const run = savedRuns[0]; // Get the most recent run
              const found = run.data.find((d: any) => d.user_id === actualUid || String(d.citizen_id) === actualUid);
              if (found) {
                userScores = {
                  "Content": parseFloat(found.content_score) || 0,
                  "Scheme": parseFloat(found.scheme_score) || 0,
                  "Job": parseFloat(found.job_score) || 0,
                  "Service": parseFloat(found.service_score) || 0
                };
                
                // Pack Demographics, Clicks Scores, and Survey Buckets into userData
                userData = {
                  Name: found.name || found.Name || userData.Name,
                  Age: found.age || found.Age || null,
                  gender: found.gender || "",
                  preferred_language: found.preferred_language || "",
                  bpl_category: found.bpl_category || "",
                  personal_income: found.personal_income || "",
                  family_income: found.family_income || "",
                  family_type_id: found.family_type_id || "",
                  Occupation: found.Occupation || found.occupation || "",
                  Working_status: found.Working_status || found.working_status || "",
                  district: found.district || "",
                  pincode: found.pincode || "",
                  house_ownership: found.house_ownership || "",
                  
                  // Score Metrics
                  primary_category: found.primary_category || "",
                  notification_tag: found.notification_tag || "",
                  engagement_time_min: parseFloat(found.engagement_time_min) || 0,
                  notification_click: parseInt(found.notification_click) || 0,
                  content_score: parseFloat(found.content_score) || 0,
                  scheme_score: parseFloat(found.scheme_score) || 0,
                  job_score: parseFloat(found.job_score) || 0,
                  service_score: parseFloat(found.service_score) || 0,
                  
                  // Survey Scoring Buckets
                  assigned_persona_id: found.assigned_persona_id || "",
                  assigned_persona_name: found.assigned_persona_name || "",
                  overlays_applied: found.overlays_applied || "",
                  health_bucket_score: parseInt(found.health_bucket_score) || 0,
                  agri_bucket_score: parseInt(found.agri_bucket_score) || 0,
                  skills_bucket_score: parseInt(found.skills_bucket_score) || 0
                };
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        const result = await generateNotifications(actualUid, geminiKey, userScores, userData);
        if (result && result.notifications) {
          allNewNotifs.push(...result.notifications);
        }
      }
      
      setGeneratedNotifs(allNewNotifs);
      setGenerationTime(formattedTime);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (users.length === 0) {
      setLog(['Error: Citizen directory empty. Fetch users first.']);
      return;
    }
    
    setRunningBulk(true);
    setProgress(0);
    setLog(['Starting bulk generation job...']);
    
    const sliceSize = Math.min(users.length, 10);
    const batchUsers = users.slice(0, sliceSize);
    
    for (let i = 0; i < batchUsers.length; i++) {
      const u = batchUsers[i];
      setLog(prev => [...prev, `Processing matches for: ${u.name}...`]);
      await generateNotifications(u.id, geminiKey);
      setProgress(Math.round(((i + 1) / batchUsers.length) * 100));
    }
    
    setLog(prev => [
      ...prev, 
      `Job completed! Successfully generated recommendations for ${batchUsers.length} citizens.`, 
      `Total generated: ${batchUsers.length * 7} notifications.`
    ]);
    setRunningBulk(false);
    fetchNotifications();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileFile(e.target.files[0]);
    }
  };

  const handleSurveyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSurveyFile(e.target.files[0]);
    }
  };

  const handleResetUploads = () => {
    setUploadFile(null);
    setProfileFile(null);
    setSurveyFile(null);
  };

  const handleUploadAndScore = async () => {
    if (!uploadFile) {
      alert("Please choose a clicks CSV file to upload.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (profileFile) {
      formData.append('profile_file', profileFile);
    }
    if (surveyFile) {
      formData.append('survey_file', surveyFile);
    }

    try {
      const _apiBase = import.meta.env.VITE_API_URL || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8000/api' : '/api');
      const response = await fetch(`${_apiBase}/users/upload-clicks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to process scoring.");
      }

      const csvText = await response.text();

      // Download CSV file response
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'citizen_engagement_scores.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Parse CSV text for UI preview and summary card stats
      const lines = csvText.split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim());
        const data: any[] = [];
        
        let totalProcessed = 0;
        let sumContent = 0;
        let sumScheme = 0;
        let sumJob = 0;
        let sumService = 0;
        let maxScore = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          const rowObj: any = {};
          
          headers.forEach((header, idx) => {
            let val = values[idx] ? values[idx].trim() : '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
            rowObj[header] = val;
          });

          const cScore = parseFloat(rowObj.content_score) || 0;
          const sScore = parseFloat(rowObj.scheme_score) || 0;
          const jScore = parseFloat(rowObj.job_score) || 0;
          const svScore = parseFloat(rowObj.service_score) || 0;
          const tScore = cScore + sScore + jScore + svScore;
          rowObj.total_score = tScore;

          sumContent += cScore;
          sumScheme += sScore;
          sumJob += jScore;
          sumService += svScore;
          if (tScore > maxScore) {
            maxScore = tScore;
          }
          totalProcessed++;

          data.push(rowObj);
        }

        setScoredPreview(data);
        setScoringStats({
          totalProcessed,
          avgContent: roundToTwo(sumContent / totalProcessed),
          avgScheme: roundToTwo(sumScheme / totalProcessed),
          avgJob: roundToTwo(sumJob / totalProcessed),
          avgService: roundToTwo(sumService / totalProcessed),
          maxScore: roundToTwo(maxScore)
        });

        // Automatically save the run to citizens storage
        const now = new Date();
        const timestamp = now.toLocaleString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        });
        try {
          const autoRun = {
            id: Date.now().toString(),
            timestamp,
            data
          };
          await saveScoringRun(autoRun);
          console.log(`Scoring run auto-saved at ${timestamp}`);
        } catch (autoErr) {
          console.error("Auto-saving scoring run failed:", autoErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during scoring calculation.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveScoringRun = async () => {
    if (scoredPreview.length === 0) {
      alert("No table data available to save. Please run the scoring engine calculation first.");
      return;
    }
    
    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    try {
      const newRun = {
        id: Date.now().toString(),
        timestamp,
        data: scoredPreview
      };
      
      await saveScoringRun(newRun);
      alert(`Scoring table successfully saved to Citizens section with timestamp: ${timestamp}`);
    } catch (err) {
      console.error(err);
      alert("Failed to save the table to local storage.");
    }
  };

  const roundToTwo = (num: number) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  // Safe JSON Parsing helper for personalized_content
  const parsePersonalization = (notif: any) => {
    try {
      return JSON.parse(notif.personalized_content);
    } catch (e) {
      // Return structured fallback
      return {
        title: notif.title,
        personalized_content: notif.personalized_content || notif.description,
        language: "en",
        vector: "Vector Dependent Aspirational",
        segment: "Content Reader",
        strategy: "Fatigue Breakthrough",
        why_bullets: [
          `Perfect match based on demographic criteria for ${notif.category}.`,
          `Eligibility scoring matrix returned high rating of ${notif.eligibility_score}%.`,
          notif.reason_for_match || "Matched based on occupation and geographic location constraints."
        ]
      };
    }
  };

  // Group generated notifications by user_id
  const groupedNotifications = generatedNotifs.reduce((acc: any, notif: any) => {
    const uid = notif.user_id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(notif);
    return acc;
  }, {});

  const getUserName = (uid: string) => {
    const matched = users.find(u => u.id === uid);
    return matched ? matched.name : `Citizen ID: ${uid.substring(0, 8)}`;
  };

  return (
    <div className="space-y-lg">
      {/* Header and Tab Switches */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Notification Generator</h1>
          <p className="font-body-md text-on-surface-variant">
            Generate and personalize citizen welfare notifications using Gemini AI scoring rules.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-surface-container-high p-xs rounded-lg border border-outline-variant font-label-md">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-lg py-sm font-label-md rounded text-label-md transition-all cursor-pointer ${
              activeTab === 'generate' ? 'bg-primary text-on-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-lg py-sm font-label-md rounded text-label-md transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-primary text-on-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-lg py-sm font-label-md rounded text-label-md transition-all cursor-pointer ${
              activeTab === 'scoring' ? 'bg-primary text-on-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Scoring Engine
          </button>
          <button
            onClick={() => setActiveTab('cohort')}
            className={`px-lg py-sm font-label-md rounded text-label-md transition-all cursor-pointer ${
              activeTab === 'cohort' ? 'bg-primary text-on-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Cohort-Wise
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'generate' ? (
        <div className="space-y-lg">

          {/* Controls Bar: User Search */}
          <div className="bg-surface-container p-md border border-outline-variant rounded-xl space-y-md">
            
            {/* Input Selection Header Toggle */}
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-xs">
              <span className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">
                Generator Settings
              </span>
              <div className="flex bg-surface-container-high p-[2px] rounded border border-outline-variant text-[11px]">
                <button
                  type="button"
                  onClick={() => { setInputType('single'); setSearchQuery(''); setSelectedUser(null); }}
                  className={`px-sm py-xs font-semibold rounded cursor-pointer ${inputType === 'single' ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'}`}
                >
                  Citizen Search
                </button>
                <button
                  type="button"
                  onClick={() => { setInputType('comma'); setSearchQuery(''); setSelectedUser(null); }}
                  className={`px-sm py-xs font-semibold rounded cursor-pointer ${inputType === 'comma' ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'}`}
                >
                  Batch UID (5-10 Users)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-end">
              {/* Citizen Search / Comma Input */}
              <div className="md:col-span-10 space-y-xs relative">
                {inputType === 'single' ? (
                  <>
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      Select Citizen Target Profile
                    </label>
                    <input
                      type="text"
                      placeholder="Search citizen name, email or ID..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        if (selectedUser) setSelectedUser(null);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full bg-surface-container-low border border-outline-variant text-on-surface p-sm rounded font-body-sm focus:outline-none focus:border-primary input-glow"
                    />
                    
                    {/* Dropdown list */}
                    {showDropdown && filteredUsers.length > 0 && (
                      <div className="absolute left-0 right-0 top-[105%] bg-surface-container border border-outline-variant rounded shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className="p-sm hover:bg-primary/10 cursor-pointer text-body-sm border-b border-outline-variant/30 flex justify-between items-center"
                          >
                            <span className="font-bold text-on-surface">{u.name}</span>
                            <span className="text-outline text-[11px] font-mono-code">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">
                        Paste Comma-Separated User IDs (5 to 10 together)
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFillSeedUsers}
                        className="text-[11px] text-primary hover:underline font-bold bg-transparent border-0 cursor-pointer"
                      >
                        [Auto-fill 5 Seed Citizens]
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 5d8a9e6b-..., 3d1c2b8a-..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant text-on-surface p-sm rounded font-body-sm focus:outline-none focus:border-primary input-glow"
                    />
                  </>
                )}
              </div>

              {/* Generate Button */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !searchQuery.trim()}
                  className="w-full bg-primary text-on-primary font-label-md py-sm rounded font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Render Generated Feeds Grouped by Citizen */}
          {Object.keys(groupedNotifications).length > 0 ? (
            <div className="space-y-xl">
              <div className="text-outline text-body-sm border-b border-outline-variant/30 pb-xs">
                Generation Completed: {generationTime}
              </div>

              {Object.keys(groupedNotifications).map((uid) => {
                const citizenNotifs = groupedNotifications[uid];
                const citizenName = getUserName(uid);
                
                return (
                  <div key={uid} className="space-y-md border-l-4 border-primary pl-md">
                    {/* Citizen Header Segment */}
                    <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                        <div className="space-y-xs">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-xs">
                            <span className="material-symbols-outlined text-primary text-[28px]">account_circle</span>
                            <span>{citizenName}</span>
                          </h3>
                          <p className="text-[11px] text-outline font-mono-code">User ID: {uid}</p>
                        </div>
                        
                        {/* Segment metrics */}
                        <div className="w-full md:w-1/4 space-y-xs">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            <span className="text-primary">Engagement Segment</span>
                            <span className="text-on-surface">Content Reader</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container border border-outline-variant rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '45.8%' }}></div>
                          </div>
                        </div>

                        {/* Bucket association verify info */}
                        <div className="flex flex-wrap gap-xs">
                          <span className="px-sm py-xs bg-primary/20 text-primary text-[10px] font-bold rounded uppercase flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[12px]">folder</span>
                            Stored in bucket: User-{uid.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Citizen Notifications list */}
                    <div className="grid grid-cols-1 gap-md">
                      {citizenNotifs.map((notif: any, idx: number) => {
                        const parsed = parsePersonalization(notif);
                        return (
                          <div
                            key={notif.id}
                            className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-md card-hover transition-all duration-300"
                          >
                            <div className="bg-surface-container-high px-md py-sm border-b border-outline-variant/50 flex justify-between items-center">
                              <span className="text-outline text-[12px]">Notification {idx + 1} — {notif.category} match</span>
                              <div className="flex gap-xs">
                                <span className="px-sm py-xs bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">
                                  {parsed.segment || 'Content Reader'}
                                </span>
                                <span className="px-sm py-xs bg-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded uppercase">
                                  {parsed.strategy || 'Fatigue Breakthrough'}
                                </span>
                              </div>
                            </div>

                            <div className="p-md space-y-md">
                              {/* Title and Translation */}
                              <div className="space-y-xs">
                                <h4 className="font-headline-md text-headline-md text-on-surface font-bold">
                                  {parsed.title}
                                </h4>
                                <p className="text-body-md text-on-surface-variant whitespace-pre-line">
                                  {parsed.personalized_content}
                                </p>
                              </div>

                              {/* Matching Scheme Link */}
                              {parsed.portal_link ? (
                                <div 
                                  onClick={() => window.open(parsed.portal_link.startsWith('http') ? parsed.portal_link : `https://${parsed.portal_link}`, '_blank')}
                                  className="flex items-center gap-xs text-[13px] font-bold text-primary hover:underline cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">link</span>
                                  <span>Apply here: {parsed.portal_link}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-xs text-[13px] font-bold text-outline">
                                  <span className="material-symbols-outlined text-[16px]">link_off</span>
                                  <span>No direct application link</span>
                                </div>
                              )}

                              {/* Badges bar */}
                              <div className="flex flex-wrap gap-xs pt-xs border-t border-outline-variant/30">
                                <span className="px-sm py-xs bg-surface-container-low border border-outline-variant text-[11px] font-mono-code rounded">
                                  ID {notif.id.substring(0, 5)}
                                </span>
                                <span className="px-sm py-xs bg-surface-container-low border border-outline-variant text-[11px] font-mono-code rounded uppercase">
                                  Lang {parsed.language || 'mr'}
                                </span>
                                <span className="px-sm py-xs bg-surface-container-low border border-outline-variant text-[11px] font-mono-code rounded">
                                  {parsed.vector || 'Vector Dependent Aspirational'}
                                </span>
                              </div>

                              {/* Bullet reasoning list */}
                              <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant/50 space-y-xs">
                                <h5 className="font-label-sm text-label-sm text-outline uppercase font-bold">
                                  Why this notification?
                                </h5>
                                <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-xs pl-xs">
                                  {parsed.why_bullets.map((bullet: string, bIdx: number) => (
                                    <li key={bIdx} className="leading-relaxed">{bullet}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Save Button */}
              <div className="flex justify-end pt-md">
                <button
                  type="button"
                  onClick={async () => {
                    const uids = Object.keys(groupedNotifications);
                    let success = true;
                    for (const uid of uids) {
                      const ok = await saveDrafts(uid);
                      if (!ok) success = false;
                    }
                    if (success) {
                      localStorage.setItem('hpns_default_tab', 'saved_generations');
                      alert("Drafts saved successfully! Redirecting to Citizen Directory.");
                      changeView('users');
                    } else {
                      alert("Failed to save some drafts.");
                    }
                  }}
                  className="bg-secondary text-on-secondary px-xl py-md font-label-md rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-xs cursor-pointer font-bold shadow-md hover:shadow-lg"
                >
                  <span className="material-symbols-outlined">save</span>
                  Save Generations to Directory
                </button>
              </div>

            </div>
          ) : (
            <div className="py-xl border border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-outline mb-sm">settings_suggest</span>
              <p className="text-on-surface font-semibold text-body-md">No items generated for this session yet.</p>
              <p className="text-outline text-body-sm mt-xs">Select a citizen or enter batch IDs and click 'Generate'.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'dashboard' ? (
        /* Original Bulk Control Panel Dashboard */
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-lg space-y-lg flex flex-col justify-between h-[450px]">
            <div>
              <h2 className="font-label-md text-on-surface font-bold uppercase pb-md border-b border-outline-variant">
                Bulk Processing Setup
              </h2>
              <div className="space-y-sm mt-md font-body-sm text-on-surface-variant">
                <p>
                  <strong>Available Citizens:</strong> {users.length} profiles loaded
                </p>
                <p>
                  <strong>Target Payload:</strong> 7 notifications per matching citizen (3 schemes, 2 jobs, 1 service, 1 healthcare)
                </p>
                <p>
                  <strong>AI Personalization Layer:</strong> Active (Gemini/OpenAI with mock local fallbacks)
                </p>
              </div>
            </div>

            <div className="space-y-md">
              {runningBulk && (
                <div className="space-y-xs">
                  <div className="flex justify-between text-[11px] font-mono-code text-outline">
                    <span>PROGRESS</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-outline-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={runningBulk}
                onClick={handleBulkGenerate}
                className="w-full bg-primary-container text-on-primary-container font-label-md py-md rounded-lg uppercase tracking-widest font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-xs cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined">refresh</span>
                <span>{runningBulk ? 'Processing...' : 'Execute Bulk Matching'}</span>
              </button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col h-[450px]">
            <h2 className="font-label-md text-on-surface font-bold uppercase pb-md border-b border-outline-variant">
              Live Generation Log
            </h2>
            <div className="flex-1 bg-surface-container-low border border-outline-variant rounded p-md font-mono-code text-[12px] text-tertiary overflow-y-auto mt-md custom-scrollbar space-y-xs">
              {log.length === 0 ? (
                <p className="text-outline text-center py-xl">Click 'Execute Bulk Matching' to start the batch engine.</p>
              ) : (
                log.map((line, idx) => (
                  <div key={idx} className="border-l-2 border-primary/30 pl-xs">
                    <span className="text-outline">[{new Date().toLocaleTimeString()}]</span> {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'scoring' ? (
        /* Engagement Scoring Dashboard */
        <div className="space-y-lg">
          <div className="bg-surface-container p-lg border border-outline-variant rounded-xl space-y-lg">
            <div className="flex flex-col gap-sm border-b border-outline-variant/30 pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[28px]">analytics</span>
                <span>Citizen Engagement Scoring Engine</span>
              </h3>
              <p className="font-body-sm text-on-surface-variant max-w-3xl">
                Execute demographic-aware interest scoring by uploading click stream activities and matching citizen profiles.
                The engine correlates interactions, applies normalization across engagement ranges, and computes priority category signals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              {/* Card 1: Click Stream Activities */}
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex flex-col justify-between space-y-md transition-all hover:shadow-md">
                <div className="space-y-xs">
                  <div className="flex items-center gap-xs text-primary font-bold">
                    <span className="px-sm py-[2px] bg-primary/20 text-primary text-[12px] rounded-full">Step 1</span>
                    <span className="font-label-md uppercase tracking-wider text-[11px]">Click Stream Activities</span>
                  </div>
                  <h4 className="font-title-md text-on-surface font-bold">Engagement Log Sheet</h4>
                  <p className="text-[12px] text-on-surface-variant">
                    Contains raw user click-stream metrics: <code>engagement_time_msec</code>, scheme views, utility service requests, and notifications clicked.
                  </p>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    id="clicks-csv-upload"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="clicks-csv-upload"
                    className={`w-full py-md border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-xs cursor-pointer transition-all hover:bg-surface-container-low ${
                      uploadFile 
                        ? 'border-primary/50 bg-primary/5 text-primary' 
                        : 'border-outline-variant hover:border-primary text-outline'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[32px]">
                      {uploadFile ? 'task_alt' : 'ads_click'}
                    </span>
                    <span className="font-bold text-body-sm px-sm text-center truncate w-full">
                      {uploadFile ? uploadFile.name : 'Select Click Activities CSV'}
                    </span>
                    <span className="text-[10px] text-outline">Required • .csv files</span>
                  </label>
                </div>
              </div>

              {/* Card 2: User Profiles */}
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex flex-col justify-between space-y-md transition-all hover:shadow-md">
                <div className="space-y-xs">
                  <div className="flex items-center gap-xs text-secondary font-bold">
                    <span className="px-sm py-[2px] bg-secondary/20 text-secondary text-[12px] rounded-full">Step 2</span>
                    <span className="font-label-md uppercase tracking-wider text-[11px]">User Profiles</span>
                  </div>
                  <h4 className="font-title-md text-on-surface font-bold">Demographics Sheet (Optional)</h4>
                  <p className="text-[12px] text-on-surface-variant">
                    Contains user metadata: <code>age</code>, <code>gender</code>, <code>state</code>, and income. If omitted, the server uses the default system profiles.
                  </p>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    id="profile-csv-upload"
                    onChange={handleProfileFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="profile-csv-upload"
                    className={`w-full py-md border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-xs cursor-pointer transition-all hover:bg-surface-container-low ${
                      profileFile 
                        ? 'border-secondary/50 bg-secondary/5 text-secondary' 
                        : 'border-outline-variant hover:border-secondary text-outline'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[32px]">
                      {profileFile ? 'task_alt' : 'account_circle'}
                    </span>
                    <span className="font-bold text-body-sm px-sm text-center truncate w-full">
                      {profileFile ? profileFile.name : 'Select Citizen Profiles CSV'}
                    </span>
                    <span className="text-[10px] text-outline">Optional • Asynchronously synced</span>
                  </label>
                </div>
              </div>

              {/* Card 3: Survey Answers */}
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex flex-col justify-between space-y-md transition-all hover:shadow-md">
                <div className="space-y-xs">
                  <div className="flex items-center gap-xs text-tertiary font-bold">
                    <span className="px-sm py-[2px] bg-tertiary/20 text-tertiary text-[12px] rounded-full">Step 3</span>
                    <span className="font-label-md uppercase tracking-wider text-[11px]">Survey Answers</span>
                  </div>
                  <h4 className="font-title-md text-on-surface font-bold">HSA Survey Answers</h4>
                  <p className="text-[12px] text-on-surface-variant">
                    Contains questionnaire responses: <code>user_id</code>, <code>question_title</code>, and <code>answer_display_value_string</code>. Refines Axis 2 Domain Mapping.
                  </p>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    id="survey-csv-upload"
                    onChange={handleSurveyFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="survey-csv-upload"
                    className={`w-full py-md border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-xs cursor-pointer transition-all hover:bg-surface-container-low ${
                      surveyFile 
                        ? 'border-tertiary/50 bg-tertiary/5 text-tertiary' 
                        : 'border-outline-variant hover:border-tertiary text-outline'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[32px]">
                      {surveyFile ? 'task_alt' : 'assignment'}
                    </span>
                    <span className="font-bold text-body-sm px-sm text-center truncate w-full">
                      {surveyFile ? surveyFile.name : 'Select Survey Answers CSV'}
                    </span>
                    <span className="text-[10px] text-outline">Optional • Refines Axis 2 Domain Mapping</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-md pt-md border-t border-outline-variant/30">
              <div className="text-[12px] text-on-surface-variant flex items-center gap-xs">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
                <span>Uploading a custom User Profile sheet will automatically sync new and existing accounts in the background.</span>
              </div>

              <div className="flex items-center gap-md">
                {(uploadFile || profileFile || surveyFile) && (
                  <button
                    onClick={handleResetUploads}
                    className="px-md py-sm border border-outline-variant hover:bg-surface-container-high text-on-surface rounded-lg font-bold transition-all text-body-sm active:scale-95"
                  >
                    Clear Files
                  </button>
                )}
                <button
                  onClick={handleUploadAndScore}
                  disabled={isUploading || !uploadFile}
                  className="bg-primary text-on-primary px-xl py-sm rounded-lg font-bold flex items-center gap-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all text-body-sm shadow-md"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                      <span>Processing Engine...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span>Run scoring & download report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {scoringStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md">
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md space-y-xs">
                <span className="text-outline text-[11px] font-bold uppercase">Processed Citizens</span>
                <p className="text-headline-md font-bold text-primary">{scoringStats.totalProcessed}</p>
              </div>
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md space-y-xs">
                <span className="text-outline text-[11px] font-bold uppercase">Avg Content Score</span>
                <p className="text-headline-md font-bold text-secondary">{scoringStats.avgContent}</p>
              </div>
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md space-y-xs">
                <span className="text-outline text-[11px] font-bold uppercase">Avg Scheme Score</span>
                <p className="text-headline-md font-bold text-tertiary">{scoringStats.avgScheme}</p>
              </div>
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md space-y-xs">
                <span className="text-outline text-[11px] font-bold uppercase">Avg Job Score</span>
                <p className="text-headline-md font-bold text-primary">{scoringStats.avgJob}</p>
              </div>
              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md space-y-xs">
                <span className="text-outline text-[11px] font-bold uppercase">Avg Service Score</span>
                <p className="text-headline-md font-bold text-green-500">{scoringStats.avgService}</p>
              </div>
            </div>
          )}

          {scoredPreview.length > 0 && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <div className="p-md border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-high flex-wrap gap-sm">
                <h4 className="font-label-md text-on-surface font-bold uppercase">Citizen Scoring Leaderboard ({scoredPreview.length} records)</h4>
                <div className="flex items-center gap-sm">
                  <button
                    onClick={handleSaveScoringRun}
                    className="px-md py-xs text-[12px] font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-xs cursor-pointer shadow"
                    style={{ backgroundColor: '#2e7d32', color: '#ffffff' }}
                  >
                    💾 Save Table to Citizens Section
                  </button>
                  <span className="px-sm py-xs bg-primary/20 text-primary text-[10px] font-bold rounded">
                    Max Score: {scoringStats?.maxScore || 0}
                  </span>
                </div>
              </div>
              
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
                      <th className="p-md">Family Type</th>
                      <th className="p-md">Occupation</th>
                      <th className="p-md">Working Status</th>
                      <th className="p-md">District</th>
                      <th className="p-md">Pincode</th>
                      <th className="p-md">House Ownership</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoredPreview.map((row, index) => (
                      <tr key={index} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                        <td className="p-md font-mono-code">{row.user_id}</td>
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
                        <td className="p-md text-right">{resolveField(row.personal_income, 'income')}</td>
                        <td className="p-md text-right">{resolveField(row.family_income, 'income')}</td>
                        <td className="p-md">{resolveField(row.family_type || row.family_type_id, 'family')}</td>
                        <td className="p-md">{resolveField(row.Occupation, 'occupation')}</td>
                        <td className="p-md">{resolveField(row.Working_status, 'working')}</td>
                        <td className="p-md">{resolveField(row.district, 'district')}</td>
                        <td className="p-md">{row.pincode}</td>
                        <td className="p-md">{resolveField(row.house_ownership, 'house')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'cohort' ? (
        <CohortWiseGenerator
          geminiKey={geminiKey}
          cohortGenMode={cohortGenMode} setCohortGenMode={setCohortGenMode}
          cohortGenSingle={cohortGenSingle} setCohortGenSingle={setCohortGenSingle}
          cohortGenLoading={cohortGenLoading} setCohortGenLoading={setCohortGenLoading}
          cohortGenResults={cohortGenResults} setCohortGenResults={setCohortGenResults}
          cohortGenError={cohortGenError} setCohortGenError={setCohortGenError}
          cohortGenLog={cohortGenLog} setCohortGenLog={setCohortGenLog}
        />
      ) : null}
    </div>
  );
};

// ─── Cohort-Wise Generator Component ─────────────────────────────────────────
const COHORT_54 = (() => {
  const BLABELS: Record<string,string> = { B1:'Content Reader', B3:'Job Hunter', B4:'Scheme Seeker', B5:'Service Explorer' };
  const DLABELS: Record<string,string> = { D1:'Health Need', D2:'Skills Need', D3:'Agriculture Need' };
  const LCLABELS: Record<string,string> = { LC1:'Farm & Land-Based', LC2:'Home & Family-Based', LC3:'Employed & Working', LC4:'Youth & Job-Seeking' };
  const HPNS: Record<string,string> = { 'B1-D1':'H4','B1-D2':'S2','B1-D3':'A7','B3-D1':'H1/H2','B3-D2':'S3','B3-D3':'A2','B4-D1':'H3','B4-D2':'S4','B4-D3':'A6','B5-D1':'H2','B5-D2':'S5','B5-D3':'A4' };
  const base: any[] = [];
  for (const b of ['B1','B3','B4','B5']) for (const d of ['D1','D2','D3']) for (const lc of ['LC1','LC2','LC3','LC4'])
    base.push({ id:`${b}-${d}-${lc}`, name:`${LCLABELS[lc]} ${BLABELS[b]} — ${DLABELS[d]}`, b, d, lc, bucket: HPNS[`${b}-${d}`]||'', eligibility: b==='B4', type:'base' });
  const overlays = [
    {id:'X1',name:'New / Dormant Signup',type:'overlay'},
    {id:'X2',name:'Multi-Domain Achiever',type:'overlay'},
    {id:'X3',name:'Incomplete-Profile User',type:'overlay'},
    {id:'X4',name:'Economically Vulnerable',type:'overlay'},
    {id:'X5',name:'Minority-Language User',type:'overlay'},
    {id:'X6',name:'Urban-Context User',type:'overlay'},
  ];
  return [...base, ...overlays];
})();

const COHORT_SYSTEM_PROMPT = `You are the cohort-level notification-copy generation engine for a citizen-facing app covering Health, Skills, and Agriculture needs across Maharashtra.

Generate exactly 7 distinct notifications per cohort supplied. Follow this exact flow for the 7 notifications:
- 3 notifications based directly on the cohort's primary Domain Need (e.g., Agriculture, Skills, or Health).
- 1 notification specifically for Healthcare / Clinics / Health awareness (regardless of their primary domain).
- 2 notifications tailored strictly to their Life-Context and Behavior Segment (e.g., if they are "Employed & Working" and "Scheme Seeker", focus on working professional schemes).
- 1 general citizen welfare or local awareness notification.

Return a flat JSON array containing all generated objects. If you are given 1 cohort, return an array of 7 objects.

Each object MUST have these fields:
{
  "cohort_id": string,
  "cohort_name": string,
  "notification_title_with_name": "must include {user_name} token",
  "title_no_name_fallback": string,
  "notification_body_generic": string,
  "notification_body_templated": string,
  "eligibility_check_required": boolean,
  "location_token_required": boolean,
  "cta_label": string,
  "cadence_tier": "standard|win-back|activation",
  "reasoning_note": string
}

Rules:
- Behaviour codes: B1=Content Reader, B3=Job Hunter, B4=Scheme Seeker, B5=Service Explorer. B2 does NOT exist.
- Domain: D1=Health, D2=Skills, D3=Agriculture.
- Life-Context: LC1=Farm & Land-Based, LC2=Home & Family-Based, LC3=Employed & Working, LC4=Youth & Job-Seeking.
- B4 cohorts are eligibility-relevant: write BOTH a generic variant (no named scheme) AND a templated variant with {scheme_name},{deadline},{district} tokens.
- B3/B5 must include {district} in body. B1 may omit it.
- Title under 6 words (excluding {user_name}); body under 25 words.
- Never fabricate real scheme names, employers, deadlines or distances — use tokens only.
- X1=activation cadence; X2/X3/X4/X5/X6=standard.
- No fear-based language, no guaranteed outcomes, one CTA only.`;

function CohortWiseGenerator({
  geminiKey,
  cohortGenMode, setCohortGenMode,
  cohortGenSingle, setCohortGenSingle,
  cohortGenLoading, setCohortGenLoading,
  cohortGenResults, setCohortGenResults,
  cohortGenError, setCohortGenError,
  cohortGenLog, setCohortGenLog
}: any) {
  const targetCohorts = cohortGenMode === 'single'
    ? COHORT_54.filter(c => c.id === cohortGenSingle)
    : COHORT_54;

  const handleGenerate = async () => {
    if (!geminiKey || !geminiKey.trim()) { setCohortGenError('Please set the Gemini API key in the code.'); return; }
    if (cohortGenMode === 'single' && !cohortGenSingle) { setCohortGenError('Please select a cohort.'); return; }
    setCohortGenLoading(true); setCohortGenResults([]); setCohortGenError(''); setCohortGenLog([]);

    const cohortList = targetCohorts.map(c =>
      `Cohort ID: ${c.id}\nCohort Name: ${c.name}\nHPNS Bucket: ${(c as any).bucket||'N/A'}\nEligibility Check Required: ${(c as any).eligibility||false}`
    ).join('\n\n');

    const userPrompt = `Generate notifications for the following ${targetCohorts.length} cohort(s):\n\n${cohortList}`;
    setCohortGenLog([`Sending ${targetCohorts.length} cohort(s) to Gemini...`]);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: COHORT_SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
          })
        }
      );
      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setCohortGenLog((prev: string[]) => [...prev, 'Response received. Parsing JSON...']);
      // Strip markdown fences if present
      const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
      const parsed = JSON.parse(cleaned);
      setCohortGenResults(Array.isArray(parsed) ? parsed : [parsed]);
      setCohortGenLog((prev: string[]) => [...prev, `✓ ${Array.isArray(parsed) ? parsed.length : 1} notification template(s) generated.`]);
    } catch (e: any) {
      setCohortGenError(e.message || 'Failed to generate cohort notifications.');
      setCohortGenLog((prev: string[]) => [...prev, `✗ Error: ${e.message}`]);
    } finally {
      setCohortGenLoading(false);
    }
  };

  const B_COLORS: Record<string,string> = {
    B1:'bg-blue-500/15 text-blue-400 border-blue-500/30', B3:'bg-amber-500/15 text-amber-400 border-amber-500/30',
    B4:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', B5:'bg-pink-500/15 text-pink-400 border-pink-500/30'
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">hub</span>
              Cohort-Wise Notification Generation
            </h2>
            <p className="font-body-sm text-on-surface-variant mt-xs">
              Generates <strong>one notification template per cohort</strong> — not per user. Uses the HPNS v5 system prompt (B2 retired, 54 cohorts total).
            </p>
          </div>
          <div className="flex gap-sm">
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-md py-sm text-center">
              <p className="text-[10px] text-outline font-bold uppercase">Cohorts</p>
              <p className="text-title-md font-bold text-primary">54</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-md py-sm text-center">
              <p className="text-[10px] text-outline font-bold uppercase">Base</p>
              <p className="text-title-md font-bold text-amber-400">48</p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-md py-sm text-center">
              <p className="text-[10px] text-outline font-bold uppercase">Overlays</p>
              <p className="text-title-md font-bold text-violet-400">6</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-xs border-t border-outline-variant/30">
          {/* Mode */}
          <div className="space-y-xs">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Generation Mode</label>
            <div className="flex bg-surface-container-low border border-outline-variant rounded-lg p-[3px]">
              {(['all','single'] as const).map(m => (
                <button key={m} onClick={() => setCohortGenMode(m)}
                  className={`flex-1 py-xs px-md rounded text-[12px] font-bold cursor-pointer transition-all ${cohortGenMode===m?'bg-primary text-on-primary':'text-outline hover:text-on-surface'}`}>
                  {m==='all'?'All 54 Cohorts':'Single Cohort'}
                </button>
              ))}
            </div>
          </div>

          {/* Single cohort picker */}
          {cohortGenMode === 'single' && (
            <div className="space-y-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Select Cohort</label>
              <select value={cohortGenSingle} onChange={e => setCohortGenSingle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-on-surface text-[12px] focus:outline-none cursor-pointer">
                <option value="">— choose —</option>
                <optgroup label="Base Cohorts (48)">
                  {COHORT_54.filter(c => c.type==='base').map(c => (
                    <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Overlay Cohorts (6)">
                  {COHORT_54.filter(c => c.type==='overlay').map(c => (
                    <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>

        {cohortGenError && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-md text-error text-[13px] font-medium">{cohortGenError}</div>
        )}

        <button onClick={handleGenerate} disabled={cohortGenLoading}
          className="w-full bg-primary text-on-primary font-bold py-md rounded-lg flex items-center justify-center gap-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {cohortGenLoading
            ? <><span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span> Generating…</>
            : <><span className="material-symbols-outlined text-[20px]">hub</span> Generate Cohort Notifications</>}
        </button>

        {cohortGenLog.length > 0 && (
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-sm font-mono-code text-[11px] text-tertiary space-y-xs max-h-24 overflow-y-auto">
            {cohortGenLog.map((l: string, i: number) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>

      {/* Results Grid */}
      {cohortGenResults.length > 0 && (
        <div className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
              {cohortGenResults.length} Cohort Template{cohortGenResults.length!==1?'s':''} Generated
            </h3>
            <button onClick={() => { 
              const blob=new Blob([JSON.stringify(cohortGenResults,null,2)],{type:'application/json'}); 
              const u=URL.createObjectURL(blob); 
              const a=document.createElement('a'); 
              a.href=u; a.download='cohort_notifications_54.json'; 
              a.click();
              
              // Also save to localStorage for the Generated Notifications tab
              const existing = JSON.parse(localStorage.getItem('hpns_saved_cohort_gens') || '[]');
              const newSaves = [...cohortGenResults, ...existing];
              // deduplicate by cohort_id and title to allow all 7 notifications per cohort to be saved
              const uniqueSaves = Array.from(new Map(newSaves.map(item => [item.cohort_id + '-' + item.notification_title_with_name, item])).values());
              localStorage.setItem('hpns_saved_cohort_gens', JSON.stringify(uniqueSaves));
              alert('Cohort generations saved successfully!');
            }}
              className="bg-secondary text-on-secondary px-xl py-md font-label-md rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-xs cursor-pointer font-bold shadow-md hover:shadow-lg">
              <span className="material-symbols-outlined">save</span>
              Save Cohort Generations
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {cohortGenResults.map((r: any, i: number) => {
              const b = r.cohort_id?.split('-')[0] || '';
              const badgeClass = B_COLORS[b] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
              return (
                <div key={i} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden hover:border-outline transition-all hover:shadow-md">
                  <div className="bg-surface-container-high border-b border-outline-variant px-md py-sm flex justify-between items-center">
                    <span className={`text-[10px] font-bold px-xs py-[2px] rounded border ${badgeClass}`}>{r.cohort_id}</span>
                    <div className="flex gap-xs">
                      {r.eligibility_check_required && <span className="text-[9px] font-bold px-xs py-[1px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">ELIGIBILITY</span>}
                      {r.location_token_required && <span className="text-[9px] font-bold px-xs py-[1px] bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded">LOCATION</span>}
                      <span className="text-[9px] font-bold px-xs py-[1px] bg-outline/20 text-outline border border-outline/20 rounded uppercase">{r.cadence_tier}</span>
                    </div>
                  </div>
                  <div className="p-md space-y-sm">
                    <p className="font-bold text-on-surface text-[13px] leading-snug">{r.notification_title_with_name}</p>
                    <p className="text-on-surface-variant text-[12px] leading-relaxed">{r.notification_body_generic}</p>
                    {r.notification_body_templated && r.notification_body_templated !== r.notification_body_generic && (
                      <div className="bg-primary/5 border border-primary/20 rounded p-sm">
                        <p className="text-[10px] font-bold text-primary uppercase mb-xs">Templated Variant</p>
                        <p className="text-on-surface text-[12px]">{r.notification_body_templated}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-xs border-t border-outline-variant/30">
                      <span className="text-[11px] font-bold px-sm py-xs bg-primary/10 text-primary rounded">{r.cta_label}</span>
                      {r.title_no_name_fallback && <span className="text-[10px] text-outline italic">Fallback: {r.title_no_name_fallback}</span>}
                    </div>
                    {r.reasoning_note && <p className="text-[10px] text-outline italic">{r.reasoning_note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

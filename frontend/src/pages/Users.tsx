import React, { useEffect, useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getScoringRuns, deleteScoringRun } from '../utils/scoringStorage';
import { loadDistrictMap, resolveField } from '../utils/mappings';

// ─── 54-Cohort Taxonomy (Cohort_Definitions_54.csv) ───────────────────



export const Users: React.FC = () => {
  const { fetchUsers } = useDashboard();
  const [msg, setMsg] = useState('');

  // Saved Runs State
  const [savedRuns, setSavedRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [viewToggle, setViewToggle] = useState<'all' | 'synced'>('all');
  const [occupationFilter, setOccupationFilter] = useState<string>('');


  const uniqueOccupations = useMemo(() => {
    if (!selectedRun || !selectedRun.data) return [];
    const occs = new Set<string>();
    selectedRun.data.forEach((row: any) => {
      const resolved = resolveField(row.Occupation || row.occupation, 'occupation');
      if (resolved && resolved !== 'N/A') {
        occs.add(resolved);
      }
    });
    return Array.from(occs).sort();
  }, [selectedRun]);

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
      const MAP: Record<string, string> = {
        "1": "Single",
        "2": "Married",
        "3": "Divorced",
        "4": "Widowed",
        "5": "Separated",
        "6": "Single",
        "7": "Single"
      };
      return MAP[cleanId] || strVal;
    }
    if (type === 'education') {
      const MAP: Record<string, string> = {
        "1": "Illiterate",
        "2": "Primary School or Below",
        "3": "Literate but no formal schooling",
        "4": "Middle School (Class 5-8)",
        "5": "High School (Class 9-10)",
        "6": "Higher Secondary (Class 11-12)",
        "7": "Diploma / Vocational",
        "8": "Graduate (Bachelor's Degree)",
        "9": "Post Graduate & Above",
        "10": "Professional Degree",
        "11": "Other"
      };
      return MAP[cleanId] || strVal;
    }
    if (type === 'house') {
      const MAP: Record<string, string> = {
        "1": "Own House",
        "2": "Owned",
        "3": "Rented",
        "4": "Provided by Employer",
        "5": "Other"
      };
      return MAP[cleanId] || strVal;
    }
    if (type === 'caste') {
      const MAP: Record<string, string> = {
        "1": "General",
        "2": "OBC",
        "3": "SC",
        "4": "ST",
        "5": "NT",
        "6": "SBC",
        "7": "EWS"
      };
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
      console.error("Error parsing saved runs in Users page", e);
    }
    return null;
  };

  useEffect(() => {
    fetchUsers();
    loadSavedRuns();
    loadDistrictMap();
  }, []);

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
    // Filter survey synced if toggle is set
    if (viewToggle === 'synced') {
      const isSynced = (parseInt(row.health_bucket_score) || 0) > 0 || 
                       (parseInt(row.agri_bucket_score) || 0) > 0 || 
                       (parseInt(row.skills_bucket_score) || 0) > 0;
      if (!isSynced) return false;
    }
    
    // Filter occupation
    if (occupationFilter) {
      const resolved = resolveField(row.Occupation || row.occupation, 'occupation');
      if (resolved !== occupationFilter) return false;
    }
    
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
      "family_type", "Occupation", "Working_status", "district", "pincode", "house_ownership"
    ];

    if (viewToggle === 'synced') {
      headers.push(
        "assigned_persona_id", "assigned_persona_name", "overlays_applied",
        "health_bucket_score", "agri_bucket_score", "skills_bucket_score"
      );
    }

    const headerLabels: Record<string, string> = {
      "user_id": "User ID",
      "name": "Name",
      "age": "Age",
      "primary_category": "Primary Category",
      "notification_tag": "Notification Tag",
      "content_score": "Content Score",
      "scheme_score": "Scheme Score",
      "job_score": "Job Score",
      "service_score": "Service Score",
      "engagement_time_min": "Engagement Time (Min)",
      "notification_click": "Notification Click",
      "preferred_language": "Preferred Language",
      "mobile_no": "Mobile No",
      "bpl_category": "BPL Category",
      "personal_income": "Personal Income",
      "family_income": "Family Income",
      "family_type": "Family Type",
      "Occupation": "Occupation",
      "Working_status": "Working Status",
      "district": "District",
      "pincode": "Pincode",
      "house_ownership": "House Ownership",
      "assigned_persona_id": "Assigned Persona ID",
      "assigned_persona_name": "Assigned Persona Name",
      "overlays_applied": "Overlays Applied",
      "health_bucket_score": "Health Responded",
      "agri_bucket_score": "Agriculture Responded",
      "skills_bucket_score": "Skill Responded"
    };

    const csvRows = [];
    csvRows.push(headers.map(h => headerLabels[h] || h).join(","));

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

  const handleDownloadCSV = (type: 'all' | 'synced') => {
    if (!selectedRun || !selectedRun.data || selectedRun.data.length === 0) return;
    
    let targetData = selectedRun.data;
    if (type === 'synced') {
      targetData = targetData.filter((row: any) => 
        (parseInt(row.health_bucket_score) || 0) > 0 || 
        (parseInt(row.agri_bucket_score) || 0) > 0 || 
        (parseInt(row.skills_bucket_score) || 0) > 0
      );
    }
    
    if (targetData.length === 0) {
      alert("No data matches the filter criteria to download.");
      return;
    }

    const headers = [
      "user_id", "name", "age", "primary_category", "notification_tag",
      "content_score", "scheme_score", "job_score", "service_score",
      "engagement_time_min", "notification_click", "preferred_language",
      "mobile_no", "bpl_category", "personal_income", "family_income",
      "family_type", "Occupation", "Working_status", "district", "pincode", "house_ownership"
    ];

    if (type === 'synced') {
      headers.push(
        "assigned_persona_id", "assigned_persona_name", "overlays_applied",
        "health_bucket_score", "agri_bucket_score", "skills_bucket_score"
      );
    }

    const headerLabels: Record<string, string> = {
      "user_id": "User ID",
      "name": "Name",
      "age": "Age",
      "primary_category": "Primary Category",
      "notification_tag": "Notification Tag",
      "content_score": "Content Score",
      "scheme_score": "Scheme Score",
      "job_score": "Job Score",
      "service_score": "Service Score",
      "engagement_time_min": "Engagement Time (Min)",
      "notification_click": "Notification Click",
      "preferred_language": "Preferred Language",
      "mobile_no": "Mobile No",
      "bpl_category": "BPL Category",
      "personal_income": "Personal Income",
      "family_income": "Family Income",
      "family_type": "Family Type",
      "Occupation": "Occupation",
      "Working_status": "Working Status",
      "district": "District",
      "pincode": "Pincode",
      "house_ownership": "House Ownership",
      "assigned_persona_id": "Assigned Persona ID",
      "assigned_persona_name": "Assigned Persona Name",
      "overlays_applied": "Overlays Applied",
      "health_bucket_score": "Health Responded",
      "agri_bucket_score": "Agriculture Responded",
      "skills_bucket_score": "Skill Responded"
    };

    const csvRows = [];
    csvRows.push(headers.map(h => headerLabels[h] || h).join(","));

    for (const row of targetData) {
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `scoring_report_${type}_${selectedRun.timestamp.replace(/[:/,\s]/g, '_')}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setMsg(`Downloaded CSV: ${filename}`);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Citizen Database Directory</h1>
        <p className="font-body-md text-on-surface-variant">
          Inspect demographic records and update parameters for the personalized matching matrix.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md bg-surface-container-high border border-outline-variant rounded-xl p-md">
        <div className="space-y-xs">
          <div className="text-outline text-[11px] font-bold uppercase tracking-wider">Demographics Profile DB</div>
          <div className="text-title-lg font-bold text-on-surface">7,616 Registered Citizens</div>
        </div>
        <div className="space-y-xs border-l border-outline-variant/30 pl-md">
          <div className="text-outline text-[11px] font-bold uppercase tracking-wider">HSA Survey Answers Database</div>
          <div className="text-title-lg font-bold text-green-400">853 Active Responders</div>
        </div>
        <div className="space-y-xs border-l border-outline-variant/30 pl-md">
          <div className="text-outline text-[11px] font-bold uppercase tracking-wider">Survey-to-Profile Overlap</div>
          <div className="text-title-lg font-bold text-primary">853 Common User IDs (100% matched)</div>
        </div>
      </div>

      {msg && (
        <div className="bg-primary/20 border border-primary p-md rounded text-on-surface font-bold text-center">
          {msg}
        </div>
      )}

      {selectedRun ? (
        /* Saved Table Detailed View */
        <div className="space-y-md">
          <div className="flex justify-between items-center bg-surface-container-high p-md rounded-xl border border-outline-variant flex-wrap gap-sm">
            <div>
              <h3 className="font-bold text-on-surface text-body-lg">
                Scoring Run Report: {selectedRun.timestamp}
              </h3>
              <p className="text-[12px] text-outline flex items-center gap-md flex-wrap mt-xs">
                <span>Total processed: <strong className="text-on-surface">{selectedRun.data?.length || 0}</strong></span>
                <span className="w-1.5 h-1.5 bg-outline-variant rounded-full"></span>
                <span>HSA Survey Synced: <strong className="text-green-400">{
                  selectedRun.data ? selectedRun.data.filter((d: any) => 
                    (parseInt(d.health_bucket_score) || 0) > 0 || 
                    (parseInt(d.agri_bucket_score) || 0) > 0 || 
                    (parseInt(d.skills_bucket_score) || 0) > 0
                  ).length : 0
                }</strong></span>
                {tableSearchQuery && (
                  <>
                    <span className="w-1.5 h-1.5 bg-outline-variant rounded-full"></span>
                    <span>Search matches: <strong className="text-primary">{filteredTableData.length}</strong></span>
                  </>
                )}
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
          <div className="flex flex-col lg:flex-row justify-between items-center gap-md bg-surface-container p-md rounded-xl border border-outline-variant">
            {/* Search Input */}
            <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs w-full lg:w-80">
              <span className="material-symbols-outlined text-[20px] text-outline">search</span>
              <input
                type="text"
                placeholder="Search citizen name, ID, district..."
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

            {/* Occupation Filter */}
            <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs w-full lg:w-60">
              <span className="material-symbols-outlined text-[20px] text-outline">work</span>
              <select
                value={occupationFilter}
                onChange={(e) => setOccupationFilter(e.target.value)}
                className="bg-transparent border-none text-on-surface text-body-sm focus:outline-none w-full py-xs cursor-pointer"
              >
                <option value="" className="bg-surface-container-high text-on-surface">All Occupations</option>
                {uniqueOccupations.map((occ) => (
                  <option key={occ} value={occ} className="bg-surface-container-high text-on-surface">
                    {occ}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle View Mode */}
            <div className="flex bg-surface-container-low border border-outline-variant rounded-lg p-[3px] w-full lg:w-auto justify-center">
              <button
                onClick={() => setViewToggle('all')}
                className={`px-md py-xs rounded font-bold text-[12px] transition-all cursor-pointer flex items-center gap-xs ${
                  viewToggle === 'all'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">list</span>
                <span>All Processed ({selectedRun.data?.length || 0})</span>
              </button>
              <button
                onClick={() => setViewToggle('synced')}
                className={`px-md py-xs rounded font-bold text-[12px] transition-all cursor-pointer flex items-center gap-xs ${
                  viewToggle === 'synced'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
                <span>HSA Survey Synced ({
                  selectedRun.data ? selectedRun.data.filter((d: any) => 
                    (parseInt(d.health_bucket_score) || 0) > 0 || 
                    (parseInt(d.agri_bucket_score) || 0) > 0 || 
                    (parseInt(d.skills_bucket_score) || 0) > 0
                  ).length : 0
                })</span>
              </button>
            </div>

            {/* Download and Copy Actions */}
            <div className="flex flex-wrap items-center gap-sm w-full lg:w-auto justify-end">
              <button
                onClick={handleCopyTableData}
                className="px-md py-sm bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-on-surface font-bold text-[12px] rounded cursor-pointer flex items-center gap-xs transition-all"
                title="Copy current filtered data as CSV"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span>Copy</span>
              </button>

              <button
                onClick={() => handleDownloadCSV('all')}
                className="px-md py-sm bg-primary-container text-on-primary-container font-bold text-[12px] rounded hover:opacity-90 cursor-pointer flex items-center gap-xs transition-all"
                title="Download all processed scoring data"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download All CSV</span>
              </button>

              <button
                onClick={() => handleDownloadCSV('synced')}
                className="px-md py-sm bg-green-500/20 text-green-400 border border-green-500/30 font-bold text-[12px] rounded hover:bg-green-500/30 cursor-pointer flex items-center gap-xs transition-all"
                title="Download HSA Survey Synced citizens only"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                <span>Download Synced CSV</span>
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
                    <th className="p-md">Family Type</th>
                    <th className="p-md">Occupation</th>
                    <th className="p-md">Working Status</th>
                    <th className="p-md">District</th>
                    <th className="p-md">Pincode</th>
                    <th className="p-md">House Ownership</th>
                    {viewToggle === 'synced' && (
                      <>
                        <th className="p-md text-center">Survey Synced</th>
                        <th className="p-md">Persona ID</th>
                        <th className="p-md">Persona Name</th>
                        <th className="p-md">Overlays</th>
                        <th className="p-md text-right">Health Responded</th>
                        <th className="p-md text-right">Agriculture Responded</th>
                        <th className="p-md text-right">Skill Responded</th>
                      </>
                    )}
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
                      <td className="p-md text-right">{resolveField(row.personal_income, 'income')}</td>
                      <td className="p-md text-right">{resolveField(row.family_income, 'income')}</td>
                      <td className="p-md">{resolveField(row.family_type || row.family_type_id, 'family')}</td>
                      <td className="p-md">{resolveField(row.Occupation, 'occupation')}</td>
                      <td className="p-md">{resolveField(row.Working_status, 'working')}</td>
                      <td className="p-md">{resolveField(row.district, 'district')}</td>
                      <td className="p-md">{row.pincode}</td>
                      <td className="p-md">{resolveField(row.house_ownership, 'house')}</td>
                      {viewToggle === 'synced' && (
                        <>
                          <td className="p-md text-center">
                            {((parseInt(row.health_bucket_score) || 0) > 0 || 
                              (parseInt(row.agri_bucket_score) || 0) > 0 || 
                              (parseInt(row.skills_bucket_score) || 0) > 0) ? (
                              <span className="px-xs py-[2px] bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase border border-green-500/30">
                                Synced
                              </span>
                            ) : (
                              <span className="text-[10px] text-outline italic">No Survey</span>
                            )}
                          </td>
                          <td className="p-md font-mono-code text-[11px] text-on-surface-variant font-bold">
                            {row.assigned_persona_id || 'N/A'}
                          </td>
                          <td className="p-md text-on-surface-variant max-w-[200px] truncate" title={row.assigned_persona_name}>
                            {row.assigned_persona_name || 'N/A'}
                          </td>
                          <td className="p-md">
                            {row.overlays_applied ? (
                              <div className="flex gap-xs flex-wrap">
                                {row.overlays_applied.split(',').map((ov: string) => (
                                  <span key={ov} className="px-xs py-[1px] bg-amber-500/20 text-amber-400 text-[10px] font-semibold rounded border border-amber-500/20" title={ov.trim()}>
                                    {ov.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-outline italic">None</span>
                            )}
                          </td>
                          <td className="p-md text-right text-red-400 font-mono-code font-bold">
                            {row.health_bucket_score || 0}
                          </td>
                          <td className="p-md text-right text-orange-400 font-mono-code font-bold">
                            {row.agri_bucket_score || 0}
                          </td>
                          <td className="p-md text-right text-blue-400 font-mono-code font-bold">
                            {row.skills_bucket_score || 0}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
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
      )}

    </div>
  );
};

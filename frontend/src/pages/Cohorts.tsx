import React, { useEffect, useState, useMemo } from 'react';
import { getScoringRuns } from '../utils/scoringStorage';
import { resolveField } from '../utils/mappings';

// ─── 54-Cohort Taxonomy (sourced from Cohort_Definitions_54.csv) ─────────────
// B2 (High Converter) retired — not present in dataset. Taxonomy: B1/B3/B4/B5.
const BEHAVIOR_LABELS: Record<string, string> = {
  B1: 'Content Reader', B3: 'Job Hunter',
  B4: 'Scheme Seeker', B5: 'Service Explorer',
};
const DOMAIN_LABELS: Record<string, string> = {
  D1: 'Health Need', D2: 'Skills Need', D3: 'Agriculture Need',
};
const CONTEXT_LABELS: Record<string, string> = {
  LC1: 'Farm & Land-Based', LC2: 'Home & Family-Based',
  LC3: 'Employed & Working', LC4: 'Youth & Job-Seeking',
};
const OVERLAY_LABELS: Record<string, string> = {
  X1: 'New / Dormant Signup', X2: 'Multi-Domain Achiever',
  X3: 'Incomplete-Profile User', X4: 'Economically Vulnerable',
  X5: 'Minority-Language User', X6: 'Urban-Context User',
};
const BEHAVIOR_COLORS: Record<string, string> = {
  B1: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  B3: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  B4: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  B5: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};
const DOMAIN_COLORS: Record<string, string> = {
  D1: 'text-red-400', D2: 'text-sky-400', D3: 'text-green-400',
};
const OVERLAY_COLORS: Record<string, string> = {
  X1: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  X2: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  X3: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  X4: 'bg-red-500/20 text-red-300 border-red-500/30',
  X5: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  X6: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
};

// Build all 48 base cohorts: B1/B3/B4/B5 × D1-D3 × LC1-LC4 = 48 (B2 retired)
const BASE_COHORTS: { id: string; label: string; b: string; d: string; lc: string; hpns_bucket: string; eligibility_relevant: boolean }[] = [];
const HPNS_BUCKET_MAP: Record<string,string> = {
  'B1-D1':'H4','B1-D2':'S2','B1-D3':'A7',
  'B3-D1':'H1/H2','B3-D2':'S3','B3-D3':'A2',
  'B4-D1':'H3','B4-D2':'S4','B4-D3':'A6',
  'B5-D1':'H2','B5-D2':'S5','B5-D3':'A4',
};
for (const b of ['B1', 'B3', 'B4', 'B5']) {
  for (const d of ['D1', 'D2', 'D3']) {
    for (const lc of ['LC1', 'LC2', 'LC3', 'LC4']) {
      BASE_COHORTS.push({
        id: `${b}-${d}-${lc}`,
        label: `${CONTEXT_LABELS[lc]} ${BEHAVIOR_LABELS[b]} — ${DOMAIN_LABELS[d]}`,
        b, d, lc,
        hpns_bucket: HPNS_BUCKET_MAP[`${b}-${d}`] || '',
        eligibility_relevant: b === 'B4',
      });
    }
  }
}
const OVERLAY_COHORTS = Object.entries(OVERLAY_LABELS).map(([k, v]) => ({ id: k, label: v }));
const ALL_COHORTS = [
  ...BASE_COHORTS.map(c => ({ ...c, type: 'base' as const })),
  ...OVERLAY_COHORTS.map(c => ({ id: c.id, label: c.label, type: 'overlay' as const, b: '', d: '', lc: '' })),
];

export const Cohorts: React.FC = () => {
  const [savedRuns, setSavedRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [cohortSearch, setCohortSearch] = useState('');
  const [cohortTypeFilter, setCohortTypeFilter] = useState<'all' | 'base' | 'overlay'>('all');
  const [cohortBehaviorFilter, setCohortBehaviorFilter] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    getScoringRuns()
      .then(runs => setSavedRuns(runs || []))
      .catch(() => setSavedRuns([]))
      .finally(() => setLoading(false));
  }, []);

  // Deduplicated flat list of all citizens across all runs
  const allRows = useMemo(() => {
    const seen = new Set<string>();
    const rows: any[] = [];
    for (const run of savedRuns) {
      if (!run?.data) continue;
      for (const row of run.data) {
        const uid = String(row.user_id || row.citizen_id || '');
        if (!seen.has(uid)) { seen.add(uid); rows.push(row); }
      }
    }
    return rows;
  }, [savedRuns]);

  // cohort_id → citizen rows
  const cohortMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const c of ALL_COHORTS) map[c.id] = [];
    for (const row of allRows) {
      const pid: string = row.assigned_persona_id || '';
      const ov: string = row.overlays_applied || '';
      if (pid && map[pid] !== undefined) map[pid].push(row);
      if (ov) {
        for (const o of ov.split(',').map((s: string) => s.trim())) {
          if (o && map[o] !== undefined) map[o].push(row);
        }
      }
    }
    return map;
  }, [allRows]);

  const totalMapped = useMemo(() => allRows.filter(r => r.assigned_persona_id).length, [allRows]);

  // Visible cohorts after search/type/behavior filters
  const visibleCohorts = useMemo(() => ALL_COHORTS.filter(c => {
    if (cohortTypeFilter !== 'all' && c.type !== cohortTypeFilter) return false;
    if (cohortBehaviorFilter && c.b !== cohortBehaviorFilter) return false;
    if (cohortSearch) {
      const q = cohortSearch.toLowerCase();
      if (!c.label.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [cohortSearch, cohortTypeFilter, cohortBehaviorFilter]);

  const selectedRows = useMemo(() => {
    if (!selectedCohort) return [];
    const rows = cohortMap[selectedCohort] || [];
    if (!tableSearch) return rows;
    const q = tableSearch.toLowerCase();
    return rows.filter((r: any) =>
      String(r.user_id || '').toLowerCase().includes(q) ||
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.district || '').toLowerCase().includes(q) ||
      String(r.Occupation || r.occupation || '').toLowerCase().includes(q) ||
      String(r.primary_category || '').toLowerCase().includes(q)
    );
  }, [selectedCohort, cohortMap, tableSearch]);

  const selectedMeta = ALL_COHORTS.find(c => c.id === selectedCohort);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2xl">
        <span className="material-symbols-outlined text-[48px] text-primary animate-spin">autorenew</span>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {/* Page Header */}
      <div className="glass-card p-xl rounded-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
        <div>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">HPNS Persona Taxonomy</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-xs flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">hub</span>
            Cohort Mapping
          </h1>
          <p className="font-body-md text-on-surface-variant mt-xs">
            All {allRows.length} scored citizens mapped across <strong className="text-primary">54 persona segments</strong> — 48 base cohorts (B1/B3/B4/B5 × D × LC) + 6 overlay flags. B2 retired.
          </p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-lg py-sm text-center">
            <p className="text-[10px] text-outline uppercase font-bold">Citizens</p>
            <p className="text-title-md font-bold text-primary">{allRows.length}</p>
          </div>
          <div className="bg-tertiary/10 border border-tertiary/20 rounded-lg px-lg py-sm text-center">
            <p className="text-[10px] text-outline uppercase font-bold">Assigned</p>
            <p className="text-title-md font-bold text-tertiary">{totalMapped}</p>
          </div>
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg px-lg py-sm text-center">
            <p className="text-[10px] text-outline uppercase font-bold">Active Cohorts</p>
            <p className="text-title-md font-bold text-secondary">
              {ALL_COHORTS.filter(c => (cohortMap[c.id] || []).length > 0).length} / 54
            </p>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
        {[
          { label: 'Base Cohorts Active', value: `${BASE_COHORTS.filter(c => (cohortMap[c.id] || []).length > 0).length} / 48`, color: 'text-blue-400' },
          { label: 'Overlay Flags Active', value: `${OVERLAY_COHORTS.filter(c => (cohortMap[c.id] || []).length > 0).length} / 6`, color: 'text-violet-400' },
          { label: 'Unassigned Citizens', value: allRows.length - totalMapped, color: 'text-outline' },
          { label: 'Assignment Rate', value: `${allRows.length > 0 ? Math.round((totalMapped / allRows.length) * 100) : 0}%`, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container border border-outline-variant p-md rounded-lg">
            <p className="text-[11px] text-outline uppercase font-bold">{s.label}</p>
            <p className={`text-title-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {allRows.length === 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-2xl text-center space-y-md">
          <span className="material-symbols-outlined text-[64px] text-outline">hub</span>
          <h3 className="font-headline-sm text-on-surface">No Scoring Data Available</h3>
          <p className="font-body-md text-on-surface-variant max-w-md mx-auto">
            Upload a clicks CSV in the Notification Generator to run the HPNS scoring engine. Cohort assignments will appear here automatically.
          </p>
        </div>
      )}

      {allRows.length > 0 && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-sm items-center bg-surface-container p-md rounded-xl border border-outline-variant">
            {/* Search */}
            <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs flex-1 min-w-[200px]">
              <span className="material-symbols-outlined text-[20px] text-outline">search</span>
              <input
                type="text"
                placeholder="Search cohort name or ID…"
                value={cohortSearch}
                onChange={e => setCohortSearch(e.target.value)}
                className="bg-transparent border-none text-on-surface text-body-sm focus:outline-none w-full py-xs"
              />
              {cohortSearch && (
                <button onClick={() => setCohortSearch('')} className="text-outline hover:text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Type Toggle */}
            <div className="flex bg-surface-container-low border border-outline-variant rounded-lg p-[3px]">
              {(['all', 'base', 'overlay'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setCohortTypeFilter(t); if (t === 'overlay') setCohortBehaviorFilter(''); }}
                  className={`px-md py-xs rounded text-[12px] font-bold transition-all cursor-pointer ${
                    cohortTypeFilter === t ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {t === 'all' ? 'All 54' : t === 'base' ? 'Base (48)' : 'Overlays (6)'}
                </button>
              ))}
            </div>

            {/* Behavior Filter */}
            {cohortTypeFilter !== 'overlay' && (
              <select
                value={cohortBehaviorFilter}
                onChange={e => setCohortBehaviorFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs text-on-surface text-[12px] font-bold cursor-pointer focus:outline-none"
              >
                <option value="">All Behaviors</option>
                {Object.entries(BEHAVIOR_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{k} — {v}</option>
                ))}
              </select>
            )}

            {selectedCohort && (
              <button
                onClick={() => { setSelectedCohort(null); setTableSearch(''); }}
                className="px-md py-xs bg-error/20 text-error border border-error/30 rounded-lg text-[12px] font-bold cursor-pointer hover:bg-error/30 transition-all flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Clear Selection
              </button>
            )}

            <span className="text-[11px] text-outline ml-auto">
              {visibleCohorts.length} cohort{visibleCohorts.length !== 1 ? 's' : ''} shown
            </span>
          </div>

          {/* Cohort Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
            {visibleCohorts.map(cohort => {
              const count = (cohortMap[cohort.id] || []).length;
              const isSelected = selectedCohort === cohort.id;
              const isOverlay = cohort.type === 'overlay';
              const badgeColor = isOverlay
                ? OVERLAY_COLORS[cohort.id] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                : BEHAVIOR_COLORS[cohort.b] || 'bg-primary/10 text-primary border-primary/20';
              const maxCount = Math.max(...ALL_COHORTS.map(c => (cohortMap[c.id] || []).length), 1);

              return (
                <button
                  key={cohort.id}
                  onClick={() => { setSelectedCohort(isSelected ? null : cohort.id); setTableSearch(''); }}
                  className={`text-left p-md rounded-xl border transition-all duration-200 cursor-pointer space-y-sm hover:scale-[1.02] active:scale-[0.99] ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container bg-primary/10 border-primary shadow-lg'
                      : count > 0
                        ? 'bg-surface-container border-outline-variant hover:border-outline hover:bg-surface-container-high hover:shadow-md'
                        : 'bg-surface-container/50 border-outline-variant/50 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* ID Badge + Count */}
                  <div className="flex justify-between items-start gap-xs">
                    <span className={`text-[10px] font-bold px-xs py-[2px] rounded border ${badgeColor}`}>
                      {cohort.id}
                    </span>
                    <span className={`text-title-md font-bold ${
                      count > 0 ? (isSelected ? 'text-primary' : 'text-on-surface') : 'text-outline'
                    }`}>{count}</span>
                  </div>

                  {/* Label */}
                  <p className="text-[12px] font-semibold text-on-surface leading-snug">{cohort.label}</p>

                  {/* Domain/Context Tags */}
                  {!isOverlay && (
                    <div className="flex gap-xs flex-wrap">
                      <span className={`text-[9px] font-bold uppercase ${DOMAIN_COLORS[cohort.d] || 'text-outline'}`}>
                        {cohort.d} · {DOMAIN_LABELS[cohort.d]}
                      </span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-surface-container-high rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? 'bg-primary' : isOverlay ? 'bg-violet-500' : 'bg-secondary'
                      }`}
                      style={{ width: count > 0 ? `${Math.max((count / maxCount) * 100, 4)}%` : '0%' }}
                    />
                  </div>

                  {count === 0 && (
                    <p className="text-[10px] text-outline italic">No citizens assigned</p>
                  )}
                </button>
              );
            })}

            {visibleCohorts.length === 0 && (
              <div className="col-span-4 text-center p-xl text-outline font-medium">
                No cohorts match the current filters.
              </div>
            )}
          </div>

          {/* ── Selected Cohort Detail Table ─────────────────────────────── */}
          {selectedCohort && (
            <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              {/* Detail Header */}
              <div className="bg-surface-container-high border-b border-outline-variant p-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
                <div className="space-y-xs">
                  <div className="flex items-center gap-sm flex-wrap">
                    <span className={`text-[11px] font-bold px-sm py-[2px] rounded border ${
                      selectedMeta?.type === 'overlay'
                        ? OVERLAY_COLORS[selectedCohort] || ''
                        : BEHAVIOR_COLORS[selectedMeta?.b || ''] || 'bg-primary/10 text-primary border-primary/20'
                    }`}>{selectedCohort}</span>
                    <h3 className="font-bold text-on-surface text-body-lg">{selectedMeta?.label}</h3>
                  </div>
                  <p className="text-[12px] text-outline">
                    <strong className="text-on-surface">{(cohortMap[selectedCohort] || []).length}</strong> citizens in this cohort
                    {selectedMeta?.type === 'base' && (
                      <span className="ml-md">
                        <span className={`font-bold ${DOMAIN_COLORS[selectedMeta.d] || ''}`}>{DOMAIN_LABELS[selectedMeta.d]}</span>
                        <span className="mx-xs">·</span>
                        <span>{CONTEXT_LABELS[selectedMeta.lc]}</span>
                        <span className="mx-xs">·</span>
                        <span>{BEHAVIOR_LABELS[selectedMeta.b]}</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-sm">
                  {/* Table Search */}
                  <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-xs">
                    <span className="material-symbols-outlined text-[18px] text-outline">search</span>
                    <input
                      type="text"
                      placeholder="Filter citizens…"
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      className="bg-transparent border-none text-on-surface text-[12px] focus:outline-none w-40 py-xs"
                    />
                  </div>
                  <button
                    onClick={() => { setSelectedCohort(null); setTableSearch(''); }}
                    className="px-md py-xs bg-outline-variant/30 hover:bg-outline-variant/50 text-on-surface font-bold text-[12px] rounded cursor-pointer flex items-center gap-xs transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span> Close
                  </button>
                </div>
              </div>

              {selectedRows.length === 0 ? (
                <div className="p-xl text-center text-outline font-medium">
                  {tableSearch ? 'No citizens match the search query.' : 'No citizens assigned to this cohort.'}
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse text-left text-body-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-surface-container-high border-b border-outline-variant/30 text-outline font-bold text-[11px] uppercase tracking-wider">
                        <th className="p-md">#</th>
                        <th className="p-md">User ID</th>
                        <th className="p-md">Name</th>
                        <th className="p-md">Age</th>
                        <th className="p-md">Occupation</th>
                        <th className="p-md">District</th>
                        <th className="p-md">Primary Category</th>
                        <th className="p-md text-right">Content</th>
                        <th className="p-md text-right">Scheme</th>
                        <th className="p-md text-right">Job</th>
                        <th className="p-md text-right">Service</th>
                        <th className="p-md">Persona ID</th>
                        <th className="p-md">Overlays</th>
                        <th className="p-md">Engagement</th>
                        <th className="p-md">Language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRows.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                          <td className="p-md text-[11px] text-outline font-mono-code">{idx + 1}</td>
                          <td className="p-md font-mono-code text-[11px] text-outline">{row.user_id}</td>
                          <td className="p-md font-bold text-on-surface">{row.name || '—'}</td>
                          <td className="p-md text-on-surface-variant">{row.age || '—'}</td>
                          <td className="p-md text-on-surface-variant">{resolveField(row.Occupation || row.occupation, 'occupation')}</td>
                          <td className="p-md text-on-surface-variant">{resolveField(row.district, 'district')}</td>
                          <td className="p-md">
                            <span className="px-xs py-[2px] bg-primary/20 text-primary text-[10px] font-bold rounded">
                              {row.primary_category || '—'}
                            </span>
                          </td>
                          <td className="p-md text-right text-secondary font-mono-code text-[12px]">{row.content_score ?? '—'}</td>
                          <td className="p-md text-right text-tertiary font-mono-code text-[12px]">{row.scheme_score ?? '—'}</td>
                          <td className="p-md text-right text-primary font-mono-code text-[12px]">{row.job_score ?? '—'}</td>
                          <td className="p-md text-right text-green-400 font-mono-code text-[12px]">{row.service_score ?? '—'}</td>
                          <td className="p-md font-mono-code text-[11px] font-bold text-on-surface">{row.assigned_persona_id || '—'}</td>
                          <td className="p-md">
                            {row.overlays_applied ? (
                              <div className="flex gap-xs flex-wrap">
                                {String(row.overlays_applied).split(',').map((ov: string) => (
                                  <span
                                    key={ov}
                                    className={`px-xs py-[1px] text-[9px] font-bold rounded border ${OVERLAY_COLORS[ov.trim()] || 'bg-outline/10 text-outline border-outline/20'}`}
                                    title={OVERLAY_LABELS[ov.trim()] || ov.trim()}
                                  >
                                    {ov.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-[10px] text-outline italic">None</span>}
                          </td>
                          <td className="p-md text-on-surface-variant text-[12px]">{row.engagement_time_min ?? '—'} min</td>
                          <td className="p-md uppercase font-semibold text-on-surface-variant text-[12px]">{row.preferred_language || 'en'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="bg-surface-container-high border-t border-outline-variant p-md flex justify-between items-center text-[12px] text-outline">
                <span>Showing <strong className="text-on-surface">{selectedRows.length}</strong> of <strong className="text-on-surface">{(cohortMap[selectedCohort] || []).length}</strong> citizens</span>
                <span className="text-[10px]">Cohort: <strong className="text-primary">{selectedCohort}</strong></span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

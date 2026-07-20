import React, { useState, useEffect } from 'react';

interface SchemeDocument {
  id?: number;
  document_name: string;
}

interface SchemeFAQ {
  id?: number;
  question: string;
  answer: string;
}

interface Scheme {
  id: string;
  scheme_name: string;
  slug: string;
  category_name?: string;
  description?: string;
  benefits?: string;
  eligibility?: string;
  documents?: string;
  application_process?: string;
  official_url?: string;
  application_url?: string;
  ministry?: string;
  department?: string;
  state?: string;
  tags?: string;
  status: string;
  source_url: string;
  last_synced?: string;
  scheme_documents?: SchemeDocument[];
  scheme_faqs?: SchemeFAQ[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const CATEGORY_MAP = [
  { slug: 'all', title: 'All Schemes', icon: 'apps', color: 'border-primary text-primary bg-primary/10' },
  { slug: 'agriculture-rural-environment', title: 'Agriculture, Rural & Environment', icon: 'agriculture', color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
  { slug: 'health-wellness', title: 'Health & Wellness', icon: 'medical_services', color: 'border-rose-500 text-rose-400 bg-rose-500/10' },
  { slug: 'skills-employment', title: 'Skills & Employment', icon: 'work', color: 'border-blue-500 text-blue-400 bg-blue-500/10' },
  { slug: 'social-welfare-empowerment', title: 'Social Welfare & Empowerment', icon: 'diversity_3', color: 'border-purple-500 text-purple-400 bg-purple-500/10' },
];

const DEFAULT_CATEGORY_COUNTS: { [slug: string]: number } = {
  'all': 2288,
  'agriculture-rural-environment': 847,
  'health-wellness': 221,
  'skills-employment': 333,
  'social-welfare-empowerment': 787
};

export const GovernmentSchemes: React.FC = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  const [totalSchemes, setTotalSchemes] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<{ [slug: string]: number }>(DEFAULT_CATEGORY_COUNTS);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [activeFaqAccordion, setActiveFaqAccordion] = useState<number | null>(null);

  const fetchCategoryCounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/myscheme/schemes/category-counts`);
      if (res.ok) {
        const counts = await res.json();
        setCategoryCounts((prev) => ({ ...prev, ...counts }));
      }
    } catch (err) {
      console.error('Failed fetching category counts:', err);
    }
  };

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/myscheme/schemes?sort_by=${sortBy}&size=5000`;
      if (activeCategoryTab !== 'all') {
        url += `&category=${activeCategoryTab}`;
      }
      if (searchKeyword.trim()) {
        url += `&keyword=${encodeURIComponent(searchKeyword.trim())}`;
      }
      if (selectedState !== 'all') {
        url += `&state=${encodeURIComponent(selectedState)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSchemes(data.items || []);
        setTotalSchemes(data.total || (data.items || []).length);
      }
    } catch (err) {
      console.error('Failed fetching schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  useEffect(() => {
    fetchSchemes();
  }, [activeCategoryTab, selectedState, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchemes();
  };

  // Group schemes by category for subsection view if 'all' tab is selected
  const getGroupedSchemes = () => {
    const grouped: { [key: string]: Scheme[] } = {
      'agriculture-rural-environment': [],
      'health-wellness': [],
      'skills-employment': [],
      'social-welfare-empowerment': []
    };

    schemes.forEach((s) => {
      const combined = `${s.category_name || ''} ${s.tags || ''} ${s.scheme_name || ''} ${s.description || ''}`.toLowerCase();
      if (combined.includes('agri') || combined.includes('rural') || combined.includes('farm') || combined.includes('krishi') || combined.includes('environment') || combined.includes('pashu') || combined.includes('bakri') || combined.includes('crop') || combined.includes('kisan') || combined.includes('canning')) {
        grouped['agriculture-rural-environment'].push(s);
      } else if (combined.includes('health') || combined.includes('wellness') || combined.includes('medical') || combined.includes('hospital') || combined.includes('swasthya') || combined.includes('sanitation')) {
        grouped['health-wellness'].push(s);
      } else if (combined.includes('skill') || combined.includes('employment') || combined.includes('job') || combined.includes('training') || combined.includes('rozgar')) {
        grouped['skills-employment'].push(s);
      } else {
        grouped['social-welfare-empowerment'].push(s);
      }
    });

    return grouped;
  };

  const renderSchemeCard = (scheme: Scheme) => (
    <div
      key={scheme.id}
      className="bg-surface-container border border-outline-variant/40 hover:border-primary/50 transition-all duration-300 rounded-2xl p-md flex flex-col justify-between group hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden"
    >
      <div className="space-y-sm">
        {/* Category & State Badges */}
        <div className="flex items-center justify-between gap-xs flex-wrap">
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wider">
            {scheme.category_name || 'Government Scheme'}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container-high text-outline">
            📍 {scheme.state || 'All India'}
          </span>
        </div>

        {/* Scheme Name */}
        <h3 className="font-headline-sm text-[16px] text-on-surface font-extrabold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {scheme.scheme_name}
        </h3>

        {/* Ministry Tag */}
        <p className="text-[11px] text-outline font-semibold flex items-center gap-xs">
          <span className="material-symbols-outlined text-[14px] text-secondary">account_balance</span>
          <span className="truncate">{scheme.ministry || 'Nodal Ministry'}</span>
        </p>

        {/* Description Summary */}
        <p className="text-[12px] text-on-surface-variant line-clamp-3 leading-relaxed">
          {scheme.description || 'Comprehensive government welfare scheme offering financial assistance and social benefits to eligible citizens.'}
        </p>
      </div>

      {/* Card Footer CTA */}
      <div className="mt-md pt-sm border-t border-outline-variant/30 flex items-center justify-between">
        <div className="text-[10px] text-outline font-medium">
          Official Direct Sync
        </div>
        <button
          onClick={() => {
            setSelectedScheme(scheme);
            setActiveFaqAccordion(null);
          }}
          className="px-md py-xs bg-primary/10 text-primary hover:bg-primary hover:text-on-primary font-bold text-[12px] rounded-xl transition-all duration-200 flex items-center gap-xs shadow-sm"
        >
          <span>View Scheme Details</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );

  const groupedSchemes = getGroupedSchemes();

  return (
    <div className="space-y-lg p-md max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low border border-outline-variant/60 rounded-3xl p-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-sm">
          <div className="flex items-center gap-xs flex-wrap">
            <div className="inline-flex items-center gap-xs px-md py-1 rounded-full bg-primary/15 text-primary text-[11px] font-extrabold uppercase tracking-widest border border-primary/20">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Official Government Scheme Repository
            </div>
            <div className="inline-flex items-center gap-xs px-md py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-black uppercase tracking-widest border border-emerald-500/30 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">database</span>
              {totalSchemes > 0 ? `${totalSchemes.toLocaleString()} Synchronized Schemes` : '2,998 Total Schemes Inventory'}
            </div>
          </div>
          <h1 className="font-headline-lg text-[32px] text-on-surface font-black tracking-tight leading-tight">
            Welfare Schemes Portal
          </h1>
          <p className="font-body-md text-on-surface-variant text-[14px] leading-relaxed">
            Synchronized directly from <span className="text-primary font-semibold">myScheme.gov.in</span> across Agriculture, Health, Skills, and Empowerment welfare sectors.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="pt-xs flex flex-col sm:flex-row gap-xs">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Search scheme name, eligibility, benefits, or keywords..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant/60 rounded-2xl py-sm pl-10 pr-md text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-lg py-sm bg-primary hover:bg-primary/90 text-on-primary font-bold text-[13px] rounded-2xl transition-all shadow-md flex items-center justify-center gap-xs"
            >
              <span>Search Portal</span>
            </button>
          </form>
        </div>
      </div>

      {/* Sub-sections & Category Navigation Tabs */}
      <div className="space-y-md">
        <div className="flex items-center gap-xs overflow-x-auto custom-scrollbar pb-xs">
          {CATEGORY_MAP.map((cat) => {
            const countVal = categoryCounts[cat.slug] ?? DEFAULT_CATEGORY_COUNTS[cat.slug] ?? 0;
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveCategoryTab(cat.slug)}
                className={`px-md py-2 rounded-2xl font-bold text-[12px] transition-all flex items-center gap-xs whitespace-nowrap border ${
                  activeCategoryTab === cat.slug
                    ? 'bg-primary text-on-primary border-primary shadow-lg scale-105'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                <span>{cat.title}</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight ${
                    activeCategoryTab === cat.slug
                      ? 'bg-on-primary/25 text-on-primary'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {countVal.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls Toolbar: State Filter & Sort */}
        <div className="flex items-center justify-between gap-md bg-surface-container p-sm rounded-2xl border border-outline-variant/40 text-[12px]">
          <div className="flex items-center gap-sm">
            <span className="text-outline font-bold uppercase tracking-wider text-[10px]">Filter State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-surface-container-high border border-outline-variant text-on-surface rounded-xl px-sm py-xs outline-none font-medium"
            >
              <option value="all">🌐 All India / States</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Bihar">Bihar</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Karnataka">Karnataka</option>
            </select>
          </div>

          <div className="flex items-center gap-sm">
            <span className="text-outline font-bold uppercase tracking-wider text-[10px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-container-high border border-outline-variant text-on-surface rounded-xl px-sm py-xs outline-none font-medium"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="a-z">🔤 Alphabetical (A-Z)</option>
              <option value="popular">🔥 Most Relevant</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schemes Display Area */}
      {loading ? (
        <div className="py-24 text-center space-y-sm">
          <div className="inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-outline text-[13px] font-medium">Fetching government scheme inventory...</p>
        </div>
      ) : activeCategoryTab !== 'all' ? (
        /* Single Tab Category View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {schemes.length === 0 ? (
            <div className="col-span-full py-16 text-center text-outline italic bg-surface-container rounded-3xl border border-dashed border-outline-variant">
              No government schemes match the selected filters.
            </div>
          ) : (
            schemes.map((scheme) => renderSchemeCard(scheme))
          )}
        </div>
      ) : (
        /* 4 Distinct Sub-sections View for Welfare Schemes */
        <div className="space-y-xl">
          {CATEGORY_MAP.filter((c) => c.slug !== 'all').map((cat) => {
            const list = groupedSchemes[cat.slug] || [];
            return (
              <div key={cat.slug} className="space-y-md border-b border-outline-variant/30 pb-lg last:border-0">
                <div className="flex items-center justify-between border-l-4 border-primary pl-md">
                  <div>
                    <h2 className="font-headline-sm text-[20px] text-on-surface font-extrabold flex items-center gap-xs">
                      <span className="material-symbols-outlined text-primary">{cat.icon}</span>
                      {cat.title}
                    </h2>
                    <p className="text-[12px] text-outline">Synchronized active government schemes</p>
                  </div>
                  <span className="px-md py-xs rounded-full bg-primary/10 text-primary font-black text-[12px] border border-primary/20">
                    {(categoryCounts[cat.slug] !== undefined ? categoryCounts[cat.slug] : list.length).toLocaleString()} Total Schemes
                  </span>
                </div>

                {list.length === 0 ? (
                  <div className="p-md text-center text-outline text-[12px] italic bg-surface-container/50 rounded-2xl">
                    No schemes loaded for this category. Perform a sync job from the sync dashboard.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    {list.map((scheme) => renderSchemeCard(scheme))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Centered Scheme Detail Modal Overlay */}
      {selectedScheme && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-md sm:p-lg transition-all duration-300 animate-fadeIn"
          onClick={() => setSelectedScheme(null)}
        >
          <div 
            className="relative w-full max-w-3xl max-h-[85vh] bg-surface-container-high border border-outline-variant/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-lg py-md border-b border-outline-variant/50 bg-surface-container/60 backdrop-blur-sm flex items-start justify-between gap-md sticky top-0 z-10">
              <div className="space-y-xs flex-1">
                <div className="flex items-center gap-xs flex-wrap">
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 tracking-wider">
                    {selectedScheme.category_name || 'Government Scheme'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface-container-highest text-primary">
                    📍 {selectedScheme.state || 'All India'}
                  </span>
                </div>
                <h2 className="font-headline-sm text-[20px] sm:text-[22px] text-on-surface font-black leading-snug">
                  {selectedScheme.scheme_name}
                </h2>
                <div className="flex items-center gap-sm text-[12px] text-outline font-semibold">
                  <span className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-secondary">account_balance</span>
                    {selectedScheme.ministry || 'Nodal Ministry'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedScheme(null)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-outline hover:text-on-surface transition-all shrink-0 border border-outline-variant/40"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="p-lg overflow-y-auto custom-scrollbar space-y-md flex-1">
              {/* Description */}
              <div className="space-y-xs">
                <h4 className="font-title-sm text-[12px] uppercase font-bold text-outline tracking-wider flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                  Scheme Overview & Objectives
                </h4>
                <p className="text-[13px] text-on-surface-variant leading-relaxed bg-surface-container p-md rounded-2xl border border-outline-variant/30 whitespace-pre-line">
                  {selectedScheme.description || 'Details unavailable.'}
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-xs">
                <h4 className="font-title-sm text-[12px] uppercase font-bold text-outline tracking-wider flex items-center gap-xs">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">payments</span>
                  Key Benefits & Financial Assistance
                </h4>
                <div className="text-[13px] text-on-surface leading-relaxed bg-emerald-500/10 p-md rounded-2xl border border-emerald-500/20 whitespace-pre-line font-medium">
                  {selectedScheme.benefits || 'Financial assistance provided as per government criteria.'}
                </div>
              </div>

              {/* Eligibility */}
              <div className="space-y-xs">
                <h4 className="font-title-sm text-[12px] uppercase font-bold text-outline tracking-wider flex items-center gap-xs">
                  <span className="material-symbols-outlined text-blue-400 text-[18px]">checklist</span>
                  Eligibility Criteria
                </h4>
                <div className="text-[13px] text-on-surface leading-relaxed bg-blue-500/10 p-md rounded-2xl border border-blue-500/20 whitespace-pre-line">
                  {selectedScheme.eligibility || 'Open to Indian citizens meeting category guidelines.'}
                </div>
              </div>

              {/* Required Documents */}
              <div className="space-y-xs">
                <h4 className="font-title-sm text-[12px] uppercase font-bold text-outline tracking-wider flex items-center gap-xs">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">badge</span>
                  Required Supporting Documents
                </h4>
                <div className="bg-surface-container p-md rounded-2xl border border-outline-variant/30 space-y-xs">
                  {selectedScheme.documents ? (
                    selectedScheme.documents.split(',').map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-xs text-[13px] text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-amber-400">check_circle</span>
                        <span>{doc.trim()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-outline">Standard Identity and Income certificates required.</p>
                  )}
                </div>
              </div>

              {/* FAQs Accordion */}
              {selectedScheme.scheme_faqs && selectedScheme.scheme_faqs.length > 0 && (
                <div className="space-y-xs">
                  <h4 className="font-title-sm text-[12px] uppercase font-bold text-outline tracking-wider flex items-center gap-xs">
                    <span className="material-symbols-outlined text-purple-400 text-[18px]">quiz</span>
                    Frequently Asked Questions (FAQs)
                  </h4>
                  <div className="space-y-xs">
                    {selectedScheme.scheme_faqs.map((faq, idx) => (
                      <div key={idx} className="border border-outline-variant/40 rounded-2xl overflow-hidden bg-surface-container">
                        <button
                          onClick={() => setActiveFaqAccordion(activeFaqAccordion === idx ? null : idx)}
                          className="w-full text-left p-md text-[13px] font-bold text-on-surface flex items-center justify-between hover:bg-surface-variant/30"
                        >
                          <span>{faq.question}</span>
                          <span className="material-symbols-outlined text-[18px]">
                            {activeFaqAccordion === idx ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                        {activeFaqAccordion === idx && (
                          <div className="p-md text-[12px] text-on-surface-variant border-t border-outline-variant/30 bg-surface-container-high leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer CTA */}
            <div className="px-lg py-md border-t border-outline-variant/50 bg-surface-container/80 backdrop-blur-sm flex items-center justify-between gap-md sticky bottom-0 z-10">
              <div className="text-[11px] text-outline font-medium truncate">
                Last synced: {selectedScheme.last_synced ? new Date(selectedScheme.last_synced).toLocaleDateString() : 'Recently'}
              </div>
              <a
                href={selectedScheme.official_url || selectedScheme.source_url}
                target="_blank"
                rel="noreferrer"
                className="px-lg py-sm bg-primary hover:bg-primary/90 text-on-primary font-extrabold text-[13px] rounded-2xl shadow-xl transition-all flex items-center gap-xs shrink-0"
              >
                <span>Apply on myScheme Portal</span>
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

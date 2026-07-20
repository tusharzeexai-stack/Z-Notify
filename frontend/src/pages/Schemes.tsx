import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { SchemeItem } from '../context/DashboardContext';

export const Schemes: React.FC = () => {
  const { schemes, fetchInventories, createScheme } = useDashboard();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<SchemeItem | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [agency, setAgency] = useState('');
  const [benefits, setBenefits] = useState('');
  const [incomeMax, setIncomeMax] = useState(300000);
  const [gender, setGender] = useState('Any');
  const [msg, setMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInventories();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !agency.trim()) {
      setMsg('Error: Title and Agency are required.');
      return;
    }
    const ok = await createScheme({
      title,
      description: desc,
      agency,
      benefit_details: benefits,
      eligibility_criteria: {
        state: 'Any',
        district: 'Any',
        income_max: parseFloat(incomeMax.toString()),
        age_min: 18,
        age_max: 65,
        occupation: 'Any',
        gender
      }
    });
    if (ok) {
      setMsg('Welfare scheme created successfully!');
      setIsAdding(false);
      setTitle('');
      setDesc('');
      setAgency('');
      setBenefits('');
      fetchInventories();
    } else {
      setMsg('Failed to create scheme.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  const getApplyUrl = (agency: string, title: string) => {
    const cleanAgency = agency.trim();
    if (cleanAgency.startsWith('http://') || cleanAgency.startsWith('https://')) {
      return cleanAgency;
    }
    if (cleanAgency.includes('.') && !cleanAgency.includes(' ')) {
      return `https://${cleanAgency}`;
    }
    return `https://www.google.com/search?q=apply+for+${encodeURIComponent(title)}+${encodeURIComponent(cleanAgency)}`;
  };

  return (
    <div className="space-y-xl">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Welfare Schemes Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage system-wide social benefit and welfare scheme packages.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-on-primary font-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-all cursor-pointer"
        >
          {isAdding ? 'View List' : 'Add Scheme'}
        </button>
      </div>

      {!isAdding && (
        <div className="flex items-center gap-sm bg-surface-container border border-outline-variant p-sm rounded-lg max-w-md focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-outline">search</span>
          <input
            type="text"
            placeholder="Search schemes by title, agency, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-on-surface w-full font-body-sm placeholder:text-outline"
          />
        </div>
      )}

      {msg && (
        <div className="bg-primary/20 border border-primary p-md rounded text-on-surface font-bold text-center">
          {msg}
        </div>
      )}

      {isAdding ? (
        <div className="bg-surface-container border border-outline-variant p-lg rounded-xl space-y-lg">
          <h2 className="font-label-md text-on-surface font-bold uppercase pb-md border-b border-outline-variant">
            Create Welfare Program Scheme
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Scheme Title</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. PM Kisan Nidhi Yojana"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Administering Agency</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Ministry of Agriculture"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Description</label>
              <textarea
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="Detailed welfare program description..."
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Benefit Details</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. INR 6,000 per year direct deposit"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Eligibility: Income Limit (Max INR/yr)</label>
              <input
                type="number"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                value={incomeMax}
                onChange={(e) => setIncomeMax(parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Eligibility: Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
              >
                <option value="Any">Any Gender</option>
                <option value="Male">Male Only</option>
                <option value="Female">Female Only</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="bg-primary text-on-primary font-label-md px-xl py-md rounded hover:opacity-90 transition-all cursor-pointer"
          >
            Save Scheme
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {schemes.filter(s => 
            (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (s.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (s.agency || '').toLowerCase().includes(searchQuery.toLowerCase())
          ).map((s) => (
            <div 
              key={s.id} 
              onClick={() => setSelectedScheme(s)}
              className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-64 card-hover cursor-pointer hover:border-primary/50 transition-all"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-label-md text-on-surface font-bold line-clamp-1">{s.title}</h3>
                  <span className="bg-primary/20 text-primary border border-primary/30 px-xs py-0.5 text-[9px] font-bold rounded">
                    SCHEME
                  </span>
                </div>
                <p className="text-[11px] text-outline mt-xs font-semibold">{s.agency}</p>
                <p className="text-body-sm text-on-surface-variant line-clamp-3 mt-sm">{s.description}</p>
                <p className="text-[11px] text-tertiary mt-xs italic">{s.benefit_details}</p>
              </div>


            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedScheme && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setSelectedScheme(null)}
        >
          <div 
            style={{
              backgroundColor: 'var(--th-surface)',
              border: '1px solid var(--th-glass-panel-border)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px',
              width: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedScheme(null)}
              className="absolute top-md right-md text-outline hover:text-on-surface hover:bg-surface-container-high w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold"
            >
              ✕
            </button>

            {/* Scheme Header */}
            <div>
              <div className="flex items-center gap-sm">
                <span className="bg-primary/20 text-primary border border-primary/30 px-xs py-0.5 text-[9px] font-bold rounded">
                  SCHEME
                </span>
                <span className="text-body-sm text-outline font-semibold">
                  ID: {selectedScheme.id}
                </span>
              </div>
              <h2 className="font-headline-md text-on-surface font-bold mt-xs">
                {selectedScheme.title}
              </h2>
              <p className="text-body-sm text-primary mt-xxs font-semibold">
                Administered by: {selectedScheme.agency}
              </p>
            </div>

            {/* Description and Benefits */}
            <div className="space-y-sm">
              <h3 className="font-label-md text-on-surface font-bold uppercase pb-xs border-b border-outline-variant/60">
                Scheme Description & Benefits
              </h3>
              <div className="text-body-md text-on-surface-variant leading-relaxed">
                <ul className="list-disc list-outside ml-md space-y-xs">
                  {selectedScheme.description
                    .split('.')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0)
                    .map((sentence: string, idx: number) => (
                      <li key={idx}>
                        {sentence.includes(':') ? (
                          <>
                            <strong className="text-on-surface font-semibold">{sentence.split(':')[0]}:</strong>
                            {sentence.split(':').slice(1).join(':')}
                          </>
                        ) : (
                          sentence
                        )}.
                      </li>
                    ))}
                </ul>
              </div>
              {selectedScheme.benefit_details && (
                <div className="bg-tertiary/10 border border-tertiary/20 p-md rounded-lg mt-sm">
                  <p className="text-[11px] text-tertiary font-bold uppercase">Key Benefit</p>
                  <p className="text-body-md text-on-surface font-medium mt-xxs">
                    {selectedScheme.benefit_details}
                  </p>
                </div>
              )}
            </div>

            {/* Eligibility Requirements */}
            <div className="space-y-sm">
              <h3 className="font-label-md text-on-surface font-bold uppercase pb-xs border-b border-outline-variant/60">
                Eligibility Requirements
              </h3>
              {selectedScheme.eligibility_criteria ? (
                <div className="grid grid-cols-2 gap-md bg-surface-container-high p-lg rounded-xl border border-outline-variant/60">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-outline uppercase font-semibold">State / Location</span>
                    <span className="text-body-md text-on-surface mt-xxs font-bold">
                      {selectedScheme.eligibility_criteria.state || 'Any'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-outline uppercase font-semibold">Target Occupation</span>
                    <span className="text-body-md text-on-surface mt-xxs font-bold">
                      {selectedScheme.eligibility_criteria.occupation || 'Any'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-outline uppercase font-semibold">Income Limit (Max)</span>
                    <span className="text-body-md text-on-surface mt-xxs font-bold">
                      {selectedScheme.eligibility_criteria.income_max && selectedScheme.eligibility_criteria.income_max < 90000000
                        ? `INR ${selectedScheme.eligibility_criteria.income_max.toLocaleString()}/yr`
                        : 'No Income Limit'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-outline uppercase font-semibold">Gender Limit</span>
                    <span className="text-body-md text-on-surface mt-xxs font-bold">
                      {selectedScheme.eligibility_criteria.gender || 'Any'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-outline uppercase font-semibold">Age Range</span>
                    <span className="text-body-md text-on-surface mt-xxs font-bold">
                      {selectedScheme.eligibility_criteria.age_min || 0} to {selectedScheme.eligibility_criteria.age_max || 120} Years
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-outline uppercase font-semibold">Disability Status</span>
                    <span className="text-body-md text-on-surface mt-xxs font-bold">
                      {selectedScheme.eligibility_criteria.disability_status || 'Any'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-body-md text-outline italic">No eligibility criteria defined.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-md pt-md border-t border-outline-variant/60 mt-sm">
              <button
                onClick={() => setSelectedScheme(null)}
                className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface font-label-md hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Close Details
              </button>
              <a
                href={getApplyUrl(selectedScheme.agency, selectedScheme.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-on-primary font-label-md px-xl py-sm rounded-lg hover:opacity-90 transition-all flex items-center justify-center"
              >
                Apply Now ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

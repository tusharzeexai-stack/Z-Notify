import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const Schemes: React.FC = () => {
  const { schemes, fetchInventories, createScheme } = useDashboard();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [agency, setAgency] = useState('');
  const [benefits, setBenefits] = useState('');
  const [incomeMax, setIncomeMax] = useState(300000);
  const [gender, setGender] = useState('Any');
  const [msg, setMsg] = useState('');

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
          {schemes.map((s) => (
            <div key={s.id} className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-64 card-hover">
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

              <div className="border-t border-outline-variant/50 pt-sm mt-md text-[10px] text-outline font-mono-code">
                CRITERIA: Max Income INR {s.eligibility_criteria.income_max?.toLocaleString() || 'Any'} | Gender: {s.eligibility_criteria.gender}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

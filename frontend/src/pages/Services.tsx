import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const Services: React.FC = () => {
  const { services, fetchInventories, createService } = useDashboard();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dept, setDept] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchInventories();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !dept.trim()) {
      setMsg('Error: Title and Department are required.');
      return;
    }
    const ok = await createService({
      title,
      description: desc,
      department: dept,
      eligibility_criteria: {
        state: 'Any',
        district: 'Any',
        income_max: 500000.0,
        age_min: 18,
        occupation: 'Any'
      }
    });
    if (ok) {
      setMsg('Public service created successfully!');
      setIsAdding(false);
      setTitle('');
      setDesc('');
      setDept('');
      fetchInventories();
    } else {
      setMsg('Failed to create service.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Citizen Services Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage system-wide digital government utility services.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-on-primary font-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-all cursor-pointer"
        >
          {isAdding ? 'View List' : 'Add Service'}
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
            Create Government Service Portal
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Service Name</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Fertilizer Subsidy Passbook"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Department</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Department of Agriculture"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Description</label>
              <textarea
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="Description of the service, application portals, and clearances required..."
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="bg-primary text-on-primary font-label-md px-xl py-md rounded hover:opacity-90 transition-all cursor-pointer"
          >
            Create service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {services.map((sv) => (
            <div key={sv.id} className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-56 card-hover">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-label-md text-on-surface font-bold line-clamp-1">{sv.title}</h3>
                  <span className="bg-tertiary/20 text-tertiary border border-tertiary/30 px-xs py-0.5 text-[9px] font-bold rounded">
                    SERVICE
                  </span>
                </div>
                <p className="text-[11px] text-outline mt-xs font-semibold">{sv.department}</p>
                <p className="text-body-sm text-on-surface-variant line-clamp-3 mt-sm">{sv.description}</p>
              </div>

              <div className="border-t border-outline-variant/50 pt-sm mt-md text-[10px] text-outline font-mono-code">
                CRITERIA: Max Income INR {sv.eligibility_criteria.income_max?.toLocaleString() || 'Any'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

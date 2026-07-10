import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const MedicalFacilities: React.FC = () => {
  const { medicalFacilities, fetchInventories, createFacility } = useDashboard();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Primary Health Center');
  const [loc, setLoc] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchInventories();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !loc.trim()) {
      setMsg('Error: Name and Location are required.');
      return;
    }
    const ok = await createFacility({
      name,
      type,
      location: loc,
      services_offered: {
        state: 'Maharashtra', // default fallback for seeder mapping
        district: 'Pune',
        income_max: 99999999.0,
        age_min: 0,
        age_max: 120,
        services: ["Outpatient (OPD)", "Immunization"]
      }
    });
    if (ok) {
      setMsg('Healthcare facility created successfully!');
      setIsAdding(false);
      setName('');
      setLoc('');
      fetchInventories();
    } else {
      setMsg('Failed to create facility.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Healthcare Options Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage system-wide public primary health centers and general hospitals.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-on-primary font-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-all cursor-pointer"
        >
          {isAdding ? 'View List' : 'Add Facility'}
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
            Create Medical Facility
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Facility Name</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Apollo Clinic Pune"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Facility Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
              >
                <option value="Primary Health Center">Primary Health Center</option>
                <option value="Community Health Center">Community Health Center</option>
                <option value="General Hospital">General Hospital</option>
                <option value="Super Specialty Hospital">Super Specialty Hospital</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Address Location</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. 45 MG Road, Camp, Pune, Maharashtra"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="bg-primary text-on-primary font-label-md px-xl py-md rounded hover:opacity-90 transition-all cursor-pointer"
          >
            Save Facility
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {medicalFacilities.map((f) => (
            <div key={f.id} className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-56 card-hover">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-label-md text-on-surface font-bold line-clamp-1">{f.name}</h3>
                  <span className="bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/30 px-xs py-0.5 text-[9px] font-bold rounded">
                    MEDICAL
                  </span>
                </div>
                <p className="text-[11px] text-outline mt-xs font-semibold">{f.type}</p>
                <p className="text-body-sm text-on-surface-variant line-clamp-3 mt-sm">{f.location}</p>
              </div>

              <div className="border-t border-outline-variant/50 pt-sm mt-md text-[10px] text-outline font-mono-code">
                SERVICES: {f.services_offered.services?.join(', ') || 'General Treatment'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

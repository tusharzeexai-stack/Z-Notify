import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const Jobs: React.FC = () => {
  const { jobs, fetchInventories, createJob } = useDashboard();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dept, setDept] = useState('');
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [education, setEducation] = useState('Graduate');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchInventories();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !dept.trim()) {
      setMsg('Error: Title and Department are required.');
      return;
    }
    const ok = await createJob({
      title,
      description: desc,
      department: dept,
      salary,
      location,
      eligibility_criteria: {
        state: 'Any',
        district: 'Any',
        income_max: 99999999.0,
        age_min: 18,
        age_max: 35,
        occupation: 'Any',
        education
      }
    });
    if (ok) {
      setMsg('Job opportunity posting created successfully!');
      setIsAdding(false);
      setTitle('');
      setDesc('');
      setDept('');
      setSalary('');
      setLocation('');
      fetchInventories();
    } else {
      setMsg('Failed to create job.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Career Openings Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage system-wide vacancies and recruitment notifications.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-on-primary font-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-all cursor-pointer"
        >
          {isAdding ? 'View List' : 'Post Job'}
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
            Post Vacancy details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Job Title</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Junior Systems Assistant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Department</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Ministry of Railways"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Description</label>
              <textarea
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="Role details, clearances and duties..."
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Salary Package</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. INR 35,000 per month"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Location</label>
              <input
                type="text"
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
                placeholder="e.g. Bengaluru, Karnataka"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-outline">Eligibility: Education level</label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
              >
                <option value="Secondary">Secondary</option>
                <option value="Higher Secondary">Higher Secondary</option>
                <option value="Graduate">Graduate</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="bg-primary text-on-primary font-label-md px-xl py-md rounded hover:opacity-90 transition-all cursor-pointer"
          >
            Post vacancy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {jobs.map((j) => (
            <div key={j.id} className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-64 card-hover">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-label-md text-on-surface font-bold line-clamp-1">{j.title}</h3>
                  <span className="bg-secondary/20 text-secondary border border-secondary/30 px-xs py-0.5 text-[9px] font-bold rounded">
                    VACANCY
                  </span>
                </div>
                <p className="text-[11px] text-outline mt-xs font-semibold">{j.department}</p>
                <p className="text-body-sm text-on-surface-variant line-clamp-3 mt-sm">{j.description}</p>
                <p className="text-[11px] text-tertiary mt-xs italic">{j.salary} | {j.location}</p>
              </div>

              <div className="border-t border-outline-variant/50 pt-sm mt-md text-[10px] text-outline font-mono-code">
                QUALIFICATIONS: Requires {j.eligibility_criteria.education} level
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

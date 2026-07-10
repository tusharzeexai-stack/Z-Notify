import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const UserSearch: React.FC = () => {
  const { users, fetchUsers, generateNotifications } = useDashboard();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchUsers(search, state, district);
  }, [search, state, district]);

  const handleRunMatch = async (userId: string) => {
    setIsGenerating(true);
    setMsg('Matching engines active... Generating 7 notifications...');
    const ok = await generateNotifications(userId);
    setIsGenerating(false);
    if (ok) {
      setMsg('Notifications generated successfully! Added to Review Queue.');
    } else {
      setMsg('Generation failed. Please try again.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Citizen Target Search</h1>
        <p className="font-body-md text-on-surface-variant">
          Locate citizen profiles and manually execute the eligibility scoring & notification generator.
        </p>
      </div>

      {msg && (
        <div className="bg-primary/20 border border-primary p-md rounded text-on-surface font-bold text-center">
          {msg}
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-surface-container border border-outline-variant p-lg rounded-xl grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="flex flex-col gap-xs">
          <label className="font-label-sm text-outline uppercase">Keyword Search</label>
          <input
            type="text"
            className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none focus:border-primary"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-xs">
          <label className="font-label-sm text-outline uppercase">Filter State</label>
          <input
            type="text"
            className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
            placeholder="e.g. Maharashtra"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-xs">
          <label className="font-label-sm text-outline uppercase">Filter District</label>
          <input
            type="text"
            className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none"
            placeholder="e.g. Pune"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Left list */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container border border-outline-variant rounded-xl overflow-hidden h-[500px] flex flex-col">
          <div className="p-md border-b border-outline-variant bg-surface-container-low font-bold">
            Matches Directory ({users.length})
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant">
            {users.length === 0 ? (
              <p className="p-lg text-center text-outline">No citizen profiles found matching parameters.</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`p-md flex items-center justify-between cursor-pointer hover:bg-surface-variant/30 transition-all ${
                    selectedUser?.id === u.id ? 'bg-secondary-container/20 border-l-4 border-primary' : ''
                  }`}
                >
                  <div>
                    <p className="font-label-md text-on-surface font-bold">{u.name}</p>
                    <p className="text-[11px] text-outline font-mono-code">{u.email}</p>
                  </div>
                  <div className="text-right text-[12px] text-on-surface-variant">
                    <p>{u.state}</p>
                    <p className="font-bold text-[10px] text-outline">{u.occupation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail Card */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col justify-between h-[500px]">
          {selectedUser ? (
            <>
              <div>
                <div className="flex justify-between items-start border-b border-outline-variant pb-md mb-md">
                  <div>
                    <h2 className="font-headline-md text-on-surface">{selectedUser.name}</h2>
                    <p className="text-[12px] text-outline font-mono-code">{selectedUser.email}</p>
                  </div>
                  <span className="bg-primary/20 text-primary border border-primary/30 px-xs py-0.5 text-[10px] font-bold rounded">
                    CITIZEN PROFILE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-sm text-[13px] text-on-surface-variant font-medium">
                  <p><strong className="text-outline">Age/Gender:</strong> {selectedUser.age || 'N/A'} yrs / {selectedUser.gender}</p>
                  <p><strong className="text-outline">Mobile:</strong> {selectedUser.mobile || 'N/A'}</p>
                  <p><strong className="text-outline">Location:</strong> {selectedUser.district}, {selectedUser.state} ({selectedUser.pincode})</p>
                  <p><strong className="text-outline">Income:</strong> INR {selectedUser.income?.toLocaleString() || 'N/A'}/yr</p>
                  <p><strong className="text-outline">Education:</strong> {selectedUser.education}</p>
                  <p><strong className="text-outline">Occupation:</strong> {selectedUser.occupation}</p>
                  <p><strong className="text-outline">Caste Category:</strong> {selectedUser.caste_category || 'General'}</p>
                  <p><strong className="text-outline">Disability:</strong> {selectedUser.disability_status || 'None'}</p>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-lg flex items-center justify-between mt-auto">
                <div className="text-[12px] text-outline max-w-xs">
                  Triggers PM matching scoring on 600+ welfare schemes, vacancies, and health alerts.
                </div>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleRunMatch(selectedUser.id)}
                  className="bg-primary text-on-primary px-xl py-md font-label-md font-bold uppercase rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">bolt</span>
                  <span>{isGenerating ? 'Matching...' : 'Run HPNS Matching'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-outline gap-md">
              <span className="material-symbols-outlined text-[64px]">account_box</span>
              <p>Select a citizen from the directory to analyze profile parameters and run recommendation scorer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

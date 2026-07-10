import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const Settings: React.FC = () => {
  const { currentUser } = useDashboard();
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [emailNotify, setEmailNotify] = useState(true);
  const [pushNotify, setPushNotify] = useState(true);
  const [syncInterval, setSyncInterval] = useState('30s');
  const [toast, setToast] = useState<string | null>(null);

  if (!currentUser) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings saved successfully.');
  };

  return (
    <div className="space-y-xl max-w-3xl">
      {/* Toast Alert */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 border border-primary px-lg py-md rounded-lg shadow-2xl flex items-center gap-md animate-bounce"
          style={{ backgroundColor: 'var(--th-surface)' }}
        >
          <span className="material-symbols-outlined text-primary">save</span>
          <span className="text-body-sm text-on-background font-bold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Settings</h1>
        <p className="font-body-md text-on-surface-variant">
          Configure notification thresholds, authentication parameters, and client settings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-lg">
        {/* Profile Details */}
        <section className="bg-surface-container border border-outline-variant p-lg space-y-md rounded-lg">
          <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-sm">
            Security & Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Profile Name</label>
              <input
                type="text"
                disabled
                className="bg-surface-container-low border border-outline-variant text-outline p-md font-body-md w-full rounded mt-xs cursor-not-allowed"
                value={currentUser.name}
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Corporate Email</label>
              <input
                type="text"
                disabled
                className="bg-surface-container-low border border-outline-variant text-outline p-md font-body-md w-full rounded mt-xs cursor-not-allowed"
                value={currentUser.email}
              />
            </div>
          </div>
        </section>

        {/* Global Notifications Defaults */}
        <section className="bg-surface-container border border-outline-variant p-lg space-y-md rounded-lg">
          <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-sm">
            Preferences & Routing
          </h3>
          <div className="space-y-sm">
            <label className="flex items-center justify-between p-sm hover:bg-surface-variant/20 rounded cursor-pointer transition-colors">
              <div>
                <p className="font-label-md text-on-surface">Email Delivery Alerts</p>
                <p className="text-[12px] text-outline">Receive email summaries for priority system events</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotify}
                onChange={() => setEmailNotify(!emailNotify)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-sm hover:bg-surface-variant/20 rounded cursor-pointer transition-colors">
              <div>
                <p className="font-label-md text-on-surface">Push Notification Relay</p>
                <p className="text-[12px] text-outline">Enable web push banners for high-severity notifications</p>
              </div>
              <input
                type="checkbox"
                checked={pushNotify}
                onChange={() => setPushNotify(!pushNotify)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-sm hover:bg-surface-variant/20 rounded cursor-pointer transition-colors">
              <div>
                <p className="font-label-md text-on-surface">Enforce Two-Factor Authorization (MFA)</p>
                <p className="text-[12px] text-outline">Enforce OTP challenges for deploying critical alerts</p>
              </div>
              <input
                type="checkbox"
                checked={mfaEnabled}
                onChange={() => setMfaEnabled(!mfaEnabled)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary"
              />
            </label>
          </div>
        </section>

        {/* Client Sync System */}
        <section className="bg-surface-container border border-outline-variant p-lg space-y-md rounded-lg">
          <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-sm">
            Client Sync Parameters
          </h3>
          <div className="flex flex-col gap-xs max-w-[320px]">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Polling Frequency
            </label>
            <select
              className="bg-surface-container-low border border-outline-variant text-on-surface p-md font-body-md rounded w-full mt-xs"
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
            >
              <option value="5s">Every 5 seconds</option>
              <option value="15s">Every 15 seconds</option>
              <option value="30s">Every 30 seconds</option>
              <option value="1m">Every 1 minute</option>
            </select>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-md">
          <button
            type="submit"
            className="px-xl py-md bg-primary-container text-on-primary-container hover:bg-primary font-label-md text-label-md font-bold uppercase tracking-widest rounded transition-all shadow-lg active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};

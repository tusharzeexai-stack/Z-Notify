import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { NotificationItem } from '../context/DashboardContext';

interface ComposeProps {
  editItem?: NotificationItem | null;
  onSuccess?: () => void;
}

export const ComposeNotification: React.FC<ComposeProps> = ({ editItem, onSuccess }) => {
  const { currentUser, createNotification, changeView, discardNotification } = useDashboard();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');
  const [audience, setAudience] = useState('All Users');
  const [schedule, setSchedule] = useState('Immediately after review');
  const [activeChannels, setActiveChannels] = useState<string[]>(['push']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setPriority(editItem.priority);
      setBody(editItem.body || '');
      setNotes(editItem.notes || '');
      setAudience(editItem.audience || 'All Users');
      setActiveChannels(editItem.channels || ['push']);
    }
  }, [editItem]);


  const toggleChannel = (channel: string) => {
    if (activeChannels.includes(channel)) {
      if (activeChannels.length > 1) {
        setActiveChannels(activeChannels.filter((c) => c !== channel));
      }
    } else {
      setActiveChannels([...activeChannels, channel]);
    }
  };

  const getPriorityDotColor = () => {
    switch (priority) {
      case 'low':
        return 'bg-tertiary';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-error';
      case 'critical':
        return 'bg-primary';
      default:
        return 'bg-tertiary';
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveDraft = () => {
    if (!title.trim() || !body.trim()) {
      showToast('Title and Message Body are required.');
      return;
    }
    createNotification({
      title,
      body,
      priority,
      audience,
      channels: activeChannels,
      submittedBy: currentUser?.email || 'admin@hpns.internal',
      status: 'draft',
      notes
    });
    if (editItem) {
      discardNotification(editItem.id);
    }
    showToast('Draft saved successfully.');
    // Clear form
    setTitle('');
    setBody('');
    setNotes('');
  };

  const handleSendForReview = () => {
    if (!title.trim() || !body.trim()) {
      showToast('Title and Message Body are required.');
      return;
    }
    createNotification({
      title,
      body,
      priority,
      audience,
      channels: activeChannels,
      submittedBy: currentUser?.email || 'admin@hpns.internal',
      status: 'pending',
      notes
    });
    if (editItem) {
      discardNotification(editItem.id);
    }
    showToast('Sent for review successfully.');
    if (onSuccess) {
      onSuccess();
    } else {
      changeView('review');
    }
  };

  return (
    <div className="space-y-xl">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 border border-primary px-lg py-md rounded-lg shadow-2xl flex items-center gap-md animate-bounce"
          style={{ backgroundColor: 'var(--th-surface)' }}
        >
          <span className="material-symbols-outlined text-primary">info</span>
          <span className="text-body-sm text-on-background font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Compose notification</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Create and schedule a new system-wide alert or targeted message.
        </p>
      </div>

      {/* Workflow Stepper */}
      <div className="flex items-center gap-0 w-full max-w-3xl">
        <div className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-xs">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold relative z-10">
              <span className="material-symbols-outlined">edit</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary">Draft</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary-container mx-base -mt-5"></div>
        </div>
        <div className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-xs">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant text-on-surface-variant flex items-center justify-center font-bold relative z-10">
              <span className="material-symbols-outlined">visibility</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Review</span>
          </div>
          <div className="h-0.5 flex-1 bg-outline-variant mx-base -mt-5"></div>
        </div>
        <div className="flex items-center">
          <div className="flex flex-col items-center gap-xs">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant text-on-surface-variant flex items-center justify-center font-bold relative z-10">
              <span className="material-symbols-outlined">send</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Push</span>
          </div>
        </div>
      </div>

      {/* Main Composition Grid */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Left Column: Details */}
        <div className="col-span-12 lg:col-span-8 space-y-lg">
          {/* Notification Content Card */}
          <div className="bg-surface-container-low border border-outline-variant p-lg space-y-lg">
            <div className="flex flex-col sm:flex-row items-stretch gap-lg">
              <div className="flex-1 flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Title</label>
                <input
                  className="bg-surface-container border border-outline-variant text-on-surface p-md font-body-md w-full focus:outline-none focus:border-primary input-glow transition-all"
                  placeholder="e.g. System Maintenance Update"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48 flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Priority</label>
                <div className="relative">
                  <select
                    className="appearance-none bg-surface-container border border-outline-variant text-on-surface px-md py-md font-body-md w-full cursor-pointer pr-10 focus:outline-none focus:border-primary input-glow transition-all"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Priority</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-xs">
                    <div className={`w-2 h-2 rounded-full ${getPriorityDotColor()}`}></div>
                    <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Message Body</label>
              <textarea
                className="bg-surface-container border border-outline-variant text-on-surface p-md font-body-md w-full resize-none focus:outline-none focus:border-primary input-glow transition-all"
                placeholder="Enter the main notification content here. Support for markdown formatting available..."
                rows={8}
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              ></textarea>
              <div className="flex justify-between items-center mt-xs">
                <p className="font-label-sm text-label-sm text-outline">
                  Character count: {body.length} / 2000
                </p>
                <div className="flex gap-sm">
                  <button type="button" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">format_bold</span>
                  </button>
                  <button type="button" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">format_italic</span>
                  </button>
                  <button type="button" className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">link</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-surface-container-low border border-outline-variant p-lg flex flex-col gap-xs">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">sticky_note_2</span>
              Internal Administration Note
            </label>
            <input
              className="bg-surface-container border border-outline-variant text-on-surface p-md font-body-md w-full focus:outline-none"
              placeholder="Reasons for this notification, internal context only..."
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="col-span-12 lg:col-span-4 space-y-lg">
          {/* Configuration Card */}
          <div className="bg-surface-container border border-outline-variant p-lg space-y-lg">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-widest border-b border-outline-variant pb-md">
              Delivery Setup
            </h3>
            <div className="space-y-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Target Audience
                </label>
                <select
                  className="bg-surface-container-high border border-outline-variant text-on-surface p-md font-body-md w-full focus:outline-none"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="All Users">All Users</option>
                  <option value="All Internal Staff">All Internal Staff</option>
                  <option value="DevOps Team & Tier 3 Support">DevOps Team & Tier 3 Support</option>
                  <option value="All Developers">All Developers</option>
                  <option value="Infrastructure Owners & SecOps">Infrastructure Owners & SecOps</option>
                  <option value="HQ Staff">HQ Staff</option>
                </select>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Schedule Delivery
                </label>
                <select
                  className="bg-surface-container-high border border-outline-variant text-on-surface p-md font-body-md w-full focus:outline-none"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                >
                  <option value="Immediately after review">Immediately after review</option>
                  <option value="Specific Date/Time">Specific Date/Time</option>
                  <option value="Manual Release">Manual Release</option>
                </select>
              </div>
            </div>

            {/* Delivery Channels */}
            <div className="space-y-md">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Delivery Channels
              </label>
              <div className="flex flex-wrap gap-xs">
                {[
                  { id: 'push', name: 'Push', icon: 'notifications_active' },
                  { id: 'mail', name: 'Email', icon: 'mail' },
                  { id: 'slack', name: 'Slack', icon: 'chat' },
                  { id: 'sms', name: 'SMS', icon: 'sms' },
                  { id: 'portal', name: 'In-app', icon: 'widgets' }
                ].map((ch) => {
                  const isActive = activeChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={`px-md py-xs border font-label-md text-label-md rounded-full flex items-center gap-xs transition-all active:scale-95 ${
                        isActive
                          ? 'bg-primary-container text-on-primary-container border-primary-container'
                          : 'bg-surface-container-highest text-on-surface border-outline-variant hover:border-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{ch.icon}</span> {ch.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Meta Info Card */}
          <div className="bg-surface-container-low border border-outline-variant p-lg space-y-md">
            <div className="flex justify-between items-center font-label-sm text-label-sm">
              <span className="text-on-surface-variant uppercase">Estimated Reach</span>
              <span className="text-tertiary">~4,280 users</span>
            </div>
            <div className="flex justify-between items-center font-label-sm text-label-sm">
              <span className="text-on-surface-variant uppercase">Delivery Score</span>
              <span className="text-on-secondary-container">High (98%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Actions */}
      <div className="flex justify-end items-center gap-md pt-lg border-t border-outline-variant">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="px-xl py-md border border-outline-variant text-on-surface hover:bg-surface-variant font-label-md text-label-md uppercase tracking-widest transition-all duration-200 active:scale-95 rounded-lg"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={handleSendForReview}
          className="px-xl py-md bg-primary-container text-on-primary-container hover:bg-primary-container/90 font-label-md text-label-md uppercase tracking-widest transition-all duration-200 shadow-lg shadow-primary-container/20 active:scale-95 flex items-center gap-md rounded-lg"
        >
          Send for review
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

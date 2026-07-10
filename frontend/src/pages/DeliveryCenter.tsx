import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const DeliveryCenter: React.FC = () => {
  const { deliveryLogs, fetchDeliveryLogs, notifications, fetchNotifications, sendNotification } = useDashboard();
  const [selectedNotif, setSelectedNotif] = useState('');
  const [channel, setChannel] = useState('SMS');
  const [isSending, setIsSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchDeliveryLogs();
    fetchNotifications();
  }, []);

  const approvedNotifs = notifications.filter(n => n.status === 'APPROVED' || n.status === 'DELIVERED');

  const handleSend = async () => {
    if (!selectedNotif) {
      setMsg('Error: Please select a notification to dispatch.');
      return;
    }
    setIsSending(true);
    setMsg('Dispatching celery worker task...');
    const ok = await sendNotification(selectedNotif, channel);
    setIsSending(false);
    if (ok) {
      setMsg(`Celery delivery job successfully queued on channel: ${channel}`);
      fetchDeliveryLogs();
    } else {
      setMsg('Failed to queue celery delivery job.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Delivery Operations Center</h1>
        <p className="font-body-md text-on-surface-variant">
          Trigger notification dispatch tasks and track Celery background queue statuses.
        </p>
      </div>

      {msg && (
        <div className={`p-md rounded font-bold text-center ${msg.includes('Error') ? 'bg-error-container/20 border border-error text-error' : 'bg-primary/20 border border-primary text-on-surface'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-gutter">
        {/* Dispatch Controls */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-lg space-y-lg flex flex-col justify-between h-[450px]">
          <div>
            <h2 className="font-label-md text-on-surface font-bold uppercase pb-md border-b border-outline-variant">
              Queue Dispatch Setup
            </h2>
            
            <div className="space-y-md mt-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-outline uppercase">Select Approved Alert</label>
                <select
                  value={selectedNotif}
                  onChange={(e) => setSelectedNotif(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none w-full"
                >
                  <option value="">-- Choose alert --</option>
                  {approvedNotifs.map(n => (
                    <option key={n.id} value={n.id}>{n.title} ({n.category})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-outline uppercase">Delivery Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant text-on-surface p-sm focus:outline-none w-full"
                >
                  <option value="SMS">Twilio SMS Gateway</option>
                  <option value="FCM">Firebase Push (FCM)</option>
                  <option value="WHATSAPP">Meta WhatsApp Business API</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isSending}
            onClick={handleSend}
            className="w-full bg-primary text-on-primary py-md rounded-lg font-label-md uppercase font-bold tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-xs cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined">send</span>
            <span>{isSending ? 'Sending...' : 'Dispatch Channel alert'}</span>
          </button>
        </div>

        {/* Live Delivery Queue Logs */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col h-[450px]">
          <h2 className="font-label-md text-on-surface font-bold uppercase pb-md border-b border-outline-variant flex justify-between items-center">
            <span>Celery Queue Delivery Audit Logs</span>
            <button
              onClick={() => fetchDeliveryLogs()}
              className="text-primary text-[12px] hover:underline flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh Logs
            </button>
          </h2>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-md mt-md">
            {deliveryLogs.length === 0 ? (
              <p className="text-outline text-center py-xl">No delivery tasks captured in queue log. Send a notification above.</p>
            ) : (
              deliveryLogs.map((log) => (
                <div key={log.id} className="bg-surface-container-low border border-outline-variant p-md rounded flex justify-between items-center gap-md">
                  <div>
                    <p className="font-label-md text-on-surface font-bold">Channel: {log.channel.toUpperCase()}</p>
                    <p className="text-[11px] text-outline font-mono-code">Notification: {log.notification_id}</p>
                    {log.error_message && (
                      <p className="text-[11px] text-error font-semibold mt-xs">{log.error_message}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-xs py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'DELIVERED' ? 'bg-tertiary/20 text-tertiary' : log.status === 'FAILED' ? 'bg-error/20 text-error' : 'bg-secondary/20 text-secondary'
                    }`}>
                      {log.status}
                    </span>
                    <p className="text-[10px] text-outline mt-xs">Retries: {log.retry_count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

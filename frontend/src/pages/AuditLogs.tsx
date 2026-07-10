import React, { useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const AuditLogs: React.FC = () => {
  const { auditLogs, fetchAuditLogs } = useDashboard();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">System Audit Trail</h1>
        <p className="font-body-md text-on-surface-variant">
          Track administrator, reviewer, and system operations for transparency.
        </p>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-outline font-label-sm uppercase">
                <th className="p-md">Timestamp</th>
                <th className="p-md">Action ID</th>
                <th className="p-md">User Email / ID</th>
                <th className="p-md">Operation Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface-variant font-mono-code">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-lg text-center text-outline font-sans">
                    No operations captured in audit trail logs yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-variant/10">
                    <td className="p-md text-on-surface whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-md text-primary font-bold">{log.action}</td>
                    <td className="p-md text-outline truncate max-w-xs">{log.user_id || 'System Daemon'}</td>
                    <td className="p-md text-on-surface-variant text-[11px]">
                      <pre className="whitespace-pre-wrap max-w-md bg-surface-container-high/40 p-xs rounded font-mono-code">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { NotificationItem } from '../context/DashboardContext';
import { getScoringRuns } from '../utils/scoringStorage';

interface ApprovedQueueProps {
  searchTerm: string;
}

const decodeUnicode = (str: string): string => {
  if (!str) return '';
  let result = str.replace(/\\u([0-9a-fA-F]{4})/g, (_match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
  result = result
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
  return result;
};

export const ApprovedQueue: React.FC<ApprovedQueueProps> = ({ searchTerm }) => {
  const { notifications, users, fetchNotifications, fetchUsers } = useDashboard();
  const [viewNotifsModal, setViewNotifsModal] = useState<NotificationItem[] | null>(null);
  const [modalCitizenName, setModalCitizenName] = useState('');
  const [scoringRuns, setScoringRuns] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    getScoringRuns().then(runs => setScoringRuns(runs)).catch(console.error);
  }, []);

  const approvedList = notifications.filter(
    (n) => n.status === 'APPROVED' || n.status === 'DELIVERED'
  );

  const getGroupedByCitizen = () => {
    // Build user mapping from scoringRuns
    const localCitizens: { [key: string]: { name: string; age: number } } = {};
    try {
      if (Array.isArray(scoringRuns)) {
        scoringRuns.forEach((run: any) => {
          if (run && Array.isArray(run.data)) {
            run.data.forEach((citizen: any) => {
              if (citizen && citizen.user_id) {
                localCitizens[String(citizen.user_id).trim()] = {
                  name: citizen.name || 'Unknown Citizen',
                  age: citizen.age ? Number(citizen.age) : 24
                };
              }
            });
          }
        });
      }
    } catch (e) {
      console.error("Failed to build localCitizens from scoringRuns", e);
    }

    const groups: { [key: string]: { citizen: any; notifications: NotificationItem[] } } = {};

    approvedList.forEach((item) => {
      // Find the citizen dynamically using the citizen_id
      let citizen: any = users.find((u) => String(u.id).trim() === String(item.citizen_id).trim());
      
      // Look up in localCitizens mapping from localStorage if not in users
      if (!citizen && item.citizen_id) {
        const localC = localCitizens[String(item.citizen_id).trim()];
        if (localC) {
          citizen = {
            id: item.citizen_id,
            name: localC.name,
            age: localC.age,
            role: 'employee',
            email: 'fallback@citizen.com'
          };
        }
      }

      // Fallback matching by name from the title if citizen_id is missing or doesn't match
      if (!citizen) {
        const title = item.title;
        const commaIdx = title.indexOf(',');
        const citizenName = commaIdx !== -1 ? title.substring(0, commaIdx).trim() : '';
        citizen = users.find((u) => u.name.toLowerCase() === citizenName.toLowerCase());

        if (!citizen && citizenName) {
          const matchByName = Object.entries(localCitizens).find(
            ([_, val]) => val.name.toLowerCase() === citizenName.toLowerCase()
          );
          if (matchByName) {
            citizen = {
              id: matchByName[0],
              name: matchByName[1].name,
              age: matchByName[1].age,
              role: 'employee',
              email: 'fallback@citizen.com'
            };
          }
        }
      }

      if (!citizen) {
        citizen = {
          id: item.citizen_id || item.user_id,
          name: 'Unknown Citizen',
          age: 24,
          role: 'employee',
          email: 'fallback@citizen.com'
        };
      }

      const key = citizen.id;
      if (!groups[key]) {
        groups[key] = {
          citizen,
          notifications: []
        };
      }
      groups[key].notifications.push(item);
    });

    return Object.values(groups).filter((group) => {
      const c = group.citizen;
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  };

  const groupedItems = getGroupedByCitizen();

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-error-container/20 text-error border border-error/30';
      case 'high':
        return 'bg-primary-container/20 text-primary border border-primary/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30';
      default:
        return 'bg-outline-variant/10 text-outline border border-outline-variant/30';
    }
  };

  return (
    <div className="space-y-xl">
      {/* Header */}
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Approved Queue</h1>
        <p className="font-body-md text-on-surface-variant">
          Welfare notifications approved and assigned to employees for distribution.
        </p>
      </div>

      {/* Grouped Table View */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant font-label-sm text-label-sm text-outline uppercase tracking-wider">
                <th className="py-md px-lg">Name</th>
                <th className="py-md px-lg">User ID</th>
                <th className="py-md px-lg">Age</th>
                <th className="py-md px-lg">Approved Notifications</th>
                <th className="py-md px-lg">Status</th>
                <th className="py-md px-lg text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {groupedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-2xl text-center text-on-surface-variant font-body-md">
                    No approved notifications found.
                  </td>
                </tr>
              ) : (
                groupedItems.map((group) => (
                  <tr
                    key={group.citizen.id}
                    className="hover:bg-surface-variant/10 transition-colors"
                  >
                    <td className="py-md px-lg font-bold text-on-surface">
                      {decodeUnicode(group.citizen.name)}
                    </td>
                    <td className="py-md px-lg font-mono-code text-[12px] text-outline">
                      {group.citizen.id}
                    </td>
                    <td className="py-md px-lg text-on-surface-variant font-medium">
                      {group.citizen.age}
                    </td>
                    <td className="py-md px-lg text-on-surface-variant font-medium">
                      {group.notifications.length}
                    </td>
                    <td className="py-md px-lg">
                      <span className="px-sm py-xs bg-green-600/15 text-green-500 border border-green-500/40 text-[11px] font-bold rounded uppercase">
                        APPROVED
                      </span>
                    </td>
                    <td className="py-md px-lg text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setViewNotifsModal(group.notifications);
                          setModalCitizenName(group.citizen.name);
                        }}
                        className="text-primary font-label-sm font-bold uppercase hover:underline cursor-pointer"
                      >
                        View Notifs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Notifications Modal */}
      {viewNotifsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim/60 backdrop-blur-sm p-md">
          <div className="bg-surface-container w-full max-w-4xl min-w-[300px] rounded-xl border border-outline-variant shadow-xl flex flex-col max-h-[85vh]">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">done_all</span>
                Approved Notifications for {decodeUnicode(modalCitizenName)}
              </h2>
              <button
                onClick={() => setViewNotifsModal(null)}
                className="text-outline hover:text-on-surface cursor-pointer p-xs rounded hover:bg-outline-variant/20 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-md overflow-y-auto space-y-lg custom-scrollbar">
              {viewNotifsModal.map((notif, idx) => {
                const content = notif.personalized_content || notif.description;
                let parsed: any = {};
                try {
                  parsed = typeof content === 'string' && content.trim().startsWith('{') ? JSON.parse(content) : { message: content };
                } catch (e) {
                  parsed = { message: content };
                }

                const assignedEmployee = users.find((u) => u.id === notif.user_id);

                return (
                  <div key={notif.id} className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-md shadow-sm">
                    <div className="flex justify-between items-start gap-md border-b border-outline-variant/50 pb-sm">
                      <div>
                        <h3 className="font-headline-sm text-primary font-bold">
                          {idx + 1}. {decodeUnicode(parsed.title || notif.title)}
                        </h3>
                        <p className="text-outline font-mono-code text-[11px] mt-xs">Category: {notif.category}</p>
                      </div>
                      <span className={`px-sm py-xs text-[11px] uppercase font-bold rounded ${getPriorityBadge(notif.priority)}`}>
                        {notif.priority}
                      </span>
                    </div>
                    
                    <div className="bg-surface-container-high/40 p-md rounded border border-outline-variant/30 space-y-xs">
                      <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Assigned Distribution Employee</p>
                      {assignedEmployee ? (
                        <div>
                          <p className="font-label-md font-bold text-on-surface">{assignedEmployee.name}</p>
                          <p className="font-body-xs text-outline-variant">{assignedEmployee.email}</p>
                        </div>
                      ) : (
                        <p className="font-body-sm text-outline-variant">Direct Citizen Delivery</p>
                      )}
                    </div>

                    <div className="bg-surface border border-outline-variant/30 rounded p-md">
                      <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                        {decodeUnicode(parsed.personalized_content || parsed.description || parsed.message || content)}
                      </p>
                    </div>

                    <div className="text-[11px] text-outline pt-xs">
                      <strong>Match Scorer Insight:</strong> {notif.reason_for_match}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-md border-t border-outline-variant bg-surface-container-high flex justify-end">
              <button 
                onClick={() => setViewNotifsModal(null)}
                className="px-xl py-sm bg-primary text-on-primary font-bold rounded font-label-md hover:opacity-90 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

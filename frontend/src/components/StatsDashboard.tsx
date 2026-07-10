import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const StatsDashboard: React.FC = () => {
  const { stats, changeView, currentUser } = useDashboard();
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    // Trigger bar chart animations
    const timer = setTimeout(() => setAnimateBars(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const barHeights = [45, 60, 50, 75, 85, 65, 55, 90, 70, 40];

  return (
    <div className="space-y-xl">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-base">System Analytics</h1>
          <p className="font-body-md text-on-surface-variant">
            Real-time performance monitoring and delivery statistics for high-frequency notification streams.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            className="bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant px-md py-sm flex items-center gap-sm transition-colors rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            <span className="font-label-md">Last 30 Days</span>
          </button>
          {currentUser?.role === 'super-admin' && (
            <button
              type="button"
              onClick={() => changeView('compose')}
              className="bg-primary-container text-on-primary-container px-md py-sm font-label-md flex items-center gap-sm hover:opacity-90 active:scale-95 transition-all rounded-lg"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>New Alert</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        {/* Total Sent */}
        <div className="bg-surface-container border border-outline-variant p-lg flex flex-col gap-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[64px] text-primary">send</span>
          </div>
          <span className="font-label-sm text-outline uppercase tracking-wider">Total Sent</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-md text-headline-md text-on-surface">
              {stats.totalSent.toLocaleString()}
            </span>
            <span className="text-tertiary font-label-sm flex items-center">+12.4%</span>
          </div>
          <div className="h-1 w-full bg-outline-variant rounded-full mt-base">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '85%' }}></div>
          </div>
        </div>

        {/* Open Rate */}
        <div className="bg-surface-container border border-outline-variant p-lg flex flex-col gap-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[64px] text-tertiary">drafts</span>
          </div>
          <span className="font-label-sm text-outline uppercase tracking-wider">Open Rate</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-md text-headline-md text-on-surface">{stats.openRate}%</span>
            <span className="text-tertiary font-label-sm flex items-center">+2.1%</span>
          </div>
          <div className="h-1 w-full bg-outline-variant rounded-full mt-base">
            <div className="h-full bg-tertiary rounded-full transition-all duration-1000" style={{ width: `${stats.openRate}%` }}></div>
          </div>
        </div>

        {/* Click Rate */}
        <div className="bg-surface-container border border-outline-variant p-lg flex flex-col gap-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[64px] text-secondary">ads_click</span>
          </div>
          <span className="font-label-sm text-outline uppercase tracking-wider">Click Rate</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-md text-headline-md text-on-surface">{stats.clickRate}%</span>
            <span className="text-error font-label-sm flex items-center">-0.4%</span>
          </div>
          <div className="h-1 w-full bg-outline-variant rounded-full mt-base">
            <div className="h-full bg-secondary rounded-full transition-all duration-1000" style={{ width: `${stats.clickRate}%` }}></div>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-surface-container border border-outline-variant p-lg flex flex-col gap-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[64px] text-error">warning</span>
          </div>
          <span className="font-label-sm text-outline uppercase tracking-wider">Failed Delivery</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-md text-headline-md text-on-surface">{stats.failedRate}%</span>
            <span className="text-tertiary font-label-sm flex items-center">Stable</span>
          </div>
          <div className="h-1 w-full bg-outline-variant rounded-full mt-base">
            <div className="h-full bg-error rounded-full transition-all duration-1000" style={{ width: '2%' }}></div>
          </div>
        </div>
      </div>

      {/* Chart Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-xl">
        {/* Bar Chart: Daily Volume Trend */}
        <div className="lg:col-span-2 bg-surface-container border border-outline-variant p-lg flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h3 className="font-label-md text-label-md text-on-surface mb-xs">Daily Volume Trend</h3>
              <p className="text-[12px] text-outline">Notification throughput over the last 14 days</p>
            </div>
            <div className="flex gap-xs">
              <div className="flex items-center gap-xs">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-[10px] text-outline">SUCCESS</span>
              </div>
              <div className="flex items-center gap-xs ml-sm">
                <div className="w-3 h-3 bg-error rounded-full"></div>
                <span className="text-[10px] text-outline">FAILED</span>
              </div>
            </div>
          </div>

          {/* Bar container */}
          <div className="flex-1 flex items-end justify-between gap-base md:gap-sm px-base h-full">
            {barHeights.map((h, i) => (
              <div key={i} className="flex-1 group relative h-full flex flex-col justify-end cursor-pointer">
                {/* Secondary highlight bar */}
                <div
                  className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-all"
                  style={{ height: `${h + 10}%` }}
                ></div>
                {/* Primary dynamic bar */}
                <div
                  className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all duration-700 ease-out group-hover:bg-[var(--th-bar-hover)]"
                  style={{ height: animateBars ? `${h}%` : '0%' }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-md px-sm text-[10px] text-outline font-mono-code">
            <span>14D AGO</span>
            <span>TODAY</span>
          </div>
        </div>

        {/* Donut Chart: Channel Distribution */}
        <div className="bg-surface-container border border-outline-variant p-lg flex flex-col h-[400px]">
          <h3 className="font-label-md text-label-md text-on-surface mb-lg">Channel Distribution</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* CSS Donut Chart Mockup */}
            <div className="relative w-44 h-44 rounded-full border-[12px] border-surface-variant flex items-center justify-center">
              {/* Segments representation */}
              <div className="absolute w-full h-full rounded-full border-[12px] border-primary border-r-transparent border-b-transparent -rotate-45"></div>
              <div className="absolute w-full h-full rounded-full border-[12px] border-secondary border-t-transparent border-l-transparent rotate-12"></div>
              <div className="absolute w-full h-full rounded-full border-[12px] border-tertiary border-t-transparent border-r-transparent rotate-[160deg]"></div>
              <div className="text-center">
                <p className="font-headline-md text-on-surface">3</p>
                <p className="font-label-sm text-outline">CHANNELS</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-xs mt-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="font-body-sm text-on-surface-variant">Push API</span>
              </div>
              <span className="font-mono-code text-on-surface">62%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                <span className="font-body-sm text-on-surface-variant">Webhook</span>
              </div>
              <span className="font-mono-code text-on-surface">28%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                <span className="font-body-sm text-on-surface-variant">Email Relay</span>
              </div>
              <span className="font-mono-code text-on-surface">10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <section className="bg-surface-container border border-outline-variant overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-label-md text-label-md text-on-surface">Top Performing Templates</h3>
          <button
            type="button"
            onClick={() => changeView('history')}
            className="text-primary font-label-sm flex items-center gap-xs hover:underline"
          >
            View Full History <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low text-outline font-label-sm uppercase">
              <tr>
                <th className="px-lg py-md font-medium tracking-wider">Template Name</th>
                <th className="px-lg py-md font-medium tracking-wider">Status</th>
                <th className="px-lg py-md font-medium tracking-wider text-right">Volume</th>
                <th className="px-lg py-md font-medium tracking-wider text-right">CTR</th>
                <th className="px-lg py-md font-medium tracking-wider text-right">Avg. Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {/* Row 1 */}
              <tr className="hover:bg-surface-variant/30 transition-colors group cursor-pointer">
                <td className="px-lg py-md">
                  <div className="flex flex-col">
                    <span className="font-label-md text-on-surface">Auth_MFA_Success</span>
                    <span className="text-[10px] font-mono-code text-outline">ID: T-8923-X</span>
                  </div>
                </td>
                <td className="px-lg py-md">
                  <span className="px-xs py-[2px] bg-tertiary/10 text-tertiary text-[10px] font-bold uppercase border border-tertiary/20">
                    Operational
                  </span>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface">412,024</td>
                <td className="px-lg py-md text-right">
                  <div className="flex items-center justify-end gap-xs">
                    <div className="w-12 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[92%]"></div>
                    </div>
                    <span className="font-mono-code text-on-surface">92%</span>
                  </div>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface-variant">142ms</td>
              </tr>
              {/* Row 2 */}
              <tr className="hover:bg-surface-variant/30 transition-colors group cursor-pointer">
                <td className="px-lg py-md">
                  <div className="flex flex-col">
                    <span className="font-label-md text-on-surface">Billing_Reminder_Weekly</span>
                    <span className="text-[10px] font-mono-code text-outline">ID: T-1044-B</span>
                  </div>
                </td>
                <td className="px-lg py-md">
                  <span className="px-xs py-[2px] bg-tertiary/10 text-tertiary text-[10px] font-bold uppercase border border-tertiary/20">
                    Operational
                  </span>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface">184,330</td>
                <td className="px-lg py-md text-right">
                  <div className="flex items-center justify-end gap-xs">
                    <div className="w-12 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[34%]"></div>
                    </div>
                    <span className="font-mono-code text-on-surface">34%</span>
                  </div>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface-variant">210ms</td>
              </tr>
              {/* Row 3 */}
              <tr className="hover:bg-surface-variant/30 transition-colors group cursor-pointer">
                <td className="px-lg py-md">
                  <div className="flex flex-col">
                    <span className="font-label-md text-on-surface">Alert_Crit_SystemDown</span>
                    <span className="text-[10px] font-mono-code text-outline">ID: T-4402-S</span>
                  </div>
                </td>
                <td className="px-lg py-md">
                  <span className="px-xs py-[2px] bg-primary-container/20 text-primary text-[10px] font-bold uppercase border border-primary/20">
                    Standby
                  </span>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface">2,110</td>
                <td className="px-lg py-md text-right">
                  <div className="flex items-center justify-end gap-xs">
                    <div className="w-12 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[98%]"></div>
                    </div>
                    <span className="font-mono-code text-on-surface">98%</span>
                  </div>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface-variant">88ms</td>
              </tr>
              {/* Row 4 */}
              <tr className="hover:bg-surface-variant/30 transition-colors group cursor-pointer">
                <td className="px-lg py-md">
                  <div className="flex flex-col">
                    <span className="font-label-md text-on-surface">Market_Promo_NewYear</span>
                    <span className="text-[10px] font-mono-code text-outline">ID: T-7731-M</span>
                  </div>
                </td>
                <td className="px-lg py-md">
                  <span className="px-xs py-[2px] bg-error-container/20 text-error text-[10px] font-bold uppercase border border-error-container/20">
                    Degraded
                  </span>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface">85,441</td>
                <td className="px-lg py-md text-right">
                  <div className="flex items-center justify-end gap-xs">
                    <div className="w-12 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[12%]"></div>
                    </div>
                    <span className="font-mono-code text-on-surface">12%</span>
                  </div>
                </td>
                <td className="px-lg py-md text-right font-mono-code text-on-surface-variant">890ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

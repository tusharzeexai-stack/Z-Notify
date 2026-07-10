import React, { useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const Analytics: React.FC = () => {
  const { fetchAnalytics, stats } = useDashboard();

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute SVG dimensions for Daily volume trend
  const volumeData = stats.daily_volume || [];
  const width = 600;
  const height = 180;
  const maxVal = Math.max(...volumeData.map((d: any) => (d.success || 0) + (d.failed || 0)), 100);
  
  const points = volumeData.map((d: any, idx: number) => {
    const x = (idx / Math.max(volumeData.length - 1, 1)) * width;
    const total = (d.success || 0) + (d.failed || 0);
    const y = height - (total / maxVal) * height;
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaD = points.length > 0 ? `${pathD} L ${width},${height} L 0,${height} Z` : '';

  // Pie chart calculation for categories
  const categories = stats.category_distribution || [];
  const totalVal = categories.reduce((sum: number, c: any) => sum + (c.value || 0), 0) || 1;
  let cumAngle = 0;

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">System Analytics & Performance</h1>
        <p className="font-body-md text-on-surface-variant">
          Analyze matching volumes, review approval distributions, and channel delivery rates.
        </p>
      </div>

      {/* Numerical Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container border border-outline-variant p-lg rounded-xl">
          <p className="text-outline text-[11px] font-bold uppercase">Approval Rate</p>
          <p className="font-headline-lg text-on-surface font-bold mt-xs">{stats.approval_rate ?? 0}%</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-lg rounded-xl">
          <p className="text-outline text-[11px] font-bold uppercase">Delivery Rate</p>
          <p className="font-headline-lg text-on-surface font-bold mt-xs">{stats.delivery_rate ?? 0}%</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-lg rounded-xl">
          <p className="text-outline text-[11px] font-bold uppercase">Dispatched Volume</p>
          <p className="font-headline-lg text-on-surface font-bold mt-xs">{stats.delivered || 0}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant p-lg rounded-xl">
          <p className="text-outline text-[11px] font-bold uppercase">Flagged Rate</p>
          <p className="font-headline-lg text-error font-bold mt-xs">{stats.flagged || 0} Alerts</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Chart 1: Daily Volume Line Area Chart */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-[300px]">
          <div>
            <h3 className="font-label-md text-on-surface font-bold uppercase">Matches generation trend</h3>
            <p className="text-[11px] text-outline font-semibold">Volume of recommendations matched (past 14 days)</p>
          </div>
          <div className="flex-1 w-full relative flex items-end justify-center pt-md">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--th-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--th-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="var(--th-outline-variant)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="var(--th-outline-variant)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="var(--th-outline-variant)" strokeWidth="0.5" strokeDasharray="4" />
              
              {/* Area path */}
              {areaD && <path d={areaD} fill="url(#areaGrad)" />}
              {/* Line path */}
              {pathD && <path d={pathD} fill="none" stroke="var(--th-primary)" strokeWidth="2.5" />}
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-outline font-mono-code pt-sm border-t border-outline-variant/40">
            {volumeData.map((d: any, idx: number) => (
              <span key={idx}>{d.date}</span>
            ))}
          </div>
        </div>

        {/* Chart 2: Category Distribution Donut */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-[300px]">
          <div>
            <h3 className="font-label-md text-on-surface font-bold uppercase">Thematic domain split</h3>
            <p className="text-[11px] text-outline font-semibold">Distribution of recommended content</p>
          </div>
          <div className="flex justify-center items-center py-md relative">
            <svg width="120" height="120" viewBox="0 0 42 42" className="transform -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--th-surface-container-high)" strokeWidth="6" />
              {categories.map((c: any, idx: number) => {
                const percent = ((c.value || 0) / totalVal) * 100;
                const dashArray = `${percent} ${100 - percent}`;
                const dashOffset = 100 - cumAngle + 25;
                cumAngle += percent;
                return (
                  <circle
                    key={idx}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={c.color || 'var(--th-primary)'}
                    strokeWidth="6"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
            </svg>
            {/* Center Count */}
            <div className="absolute text-center">
              <p className="text-[20px] font-bold text-on-surface">{stats.notifications_generated}</p>
              <p className="text-[9px] text-outline uppercase tracking-wider">Matched</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-xs text-[11px] text-on-surface-variant font-medium pt-sm border-t border-outline-variant/40">
            {categories.map((c: any, idx: number) => (
              <div key={idx} className="flex items-center gap-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                <span className="truncate">{c.name} ({Math.round(((c.value || 0) / totalVal) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Top Programs Matches (Horizontal Bar Chart) */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container border border-outline-variant p-lg rounded-xl space-y-md">
          <div>
            <h3 className="font-label-md text-on-surface font-bold uppercase">Top Performing Welfare Schemes</h3>
            <p className="text-[11px] text-outline font-semibold">Highest volume of matching citizen profiles</p>
          </div>
          <div className="space-y-sm">
            {stats.top_schemes?.map((s: any, idx: number) => (
              <div key={idx} className="space-y-xs">
                <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
                  <span>{s.name}</span>
                  <span className="font-bold">{s.matches} matches</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min((s.matches / 200) * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: District Matches */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container border border-outline-variant p-lg rounded-xl space-y-md">
          <div>
            <h3 className="font-label-md text-on-surface font-bold uppercase">Matches by Geographic District</h3>
            <p className="text-[11px] text-outline font-semibold">High impact target areas</p>
          </div>
          <div className="space-y-sm">
            {stats.district_analytics?.map((d: any, idx: number) => (
              <div key={idx} className="space-y-xs">
                <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
                  <span>{d.district}</span>
                  <span className="font-bold">{d.notifications} alerts</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: `${Math.min((d.notifications / 400) * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

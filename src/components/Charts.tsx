import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import type {
  AgentPerformance,
  CompanyBreakdown,
  ContactTypeStat,
  DepartmentStat,
  PTPStatusStat,
  ClientPTPStat,
  CallDurationBucket,
} from '../types';
import { cn } from '../utils/cn';

// Vivid, high-energy palettes that shine on dark backgrounds and remain crisp on light backgrounds
const COLORS = [
  '#6366f1', // Electric Indigo
  '#10b981', // Neon Emerald
  '#f59e0b', // Radiant Amber
  '#f43f5e', // Hot Coral
  '#8b5cf6', // Bright Purple
  '#06b6d4', // Cyan
  '#ec4899', // Hot Pink
  '#84cc16', // Lime Green
  '#f97316', // Orange
  '#14b8a6', // Teal
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800 ${
        className || ''
      }`}
    >
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function getChartTheme(isDark?: boolean) {
  return {
    grid: isDark ? '#334155' : '#e2e8f0',
    axis: isDark ? '#94a3b8' : '#64748b',
    tooltipStyle: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      color: isDark ? '#f8fafc' : '#0f172a',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: '12px',
    },
  };
}

interface AgentChartProps {
  data: AgentPerformance[];
  isDark?: boolean;
}

// Custom tooltip: shows RPC, PTP and the conversion rate for the hovered agent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RpcPtpTooltip({ active, payload, isDark }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const d: AgentPerformance = payload[0].payload;
  const rate = d.rpc > 0 ? (d.ptp / d.rpc) * 100 : 0;
  return (
    <div
      style={{
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '10px 14px',
        fontSize: '12px',
        color: isDark ? '#f8fafc' : '#0f172a',
      }}
    >
      <p className="mb-1 font-bold text-sm">{d.name}</p>
      <p>
        <span style={{ color: '#6366f1' }} className="font-semibold">RPC</span>:{' '}
        {d.rpc.toLocaleString()}
      </p>
      <p>
        <span style={{ color: '#f59e0b' }} className="font-semibold">PTP</span>:{' '}
        {d.ptp.toLocaleString()}
      </p>
      <p className="mt-1 border-t pt-1 font-bold" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        Conversion: <span style={{ color: '#10b981' }}>{rate.toFixed(1)}%</span>
      </p>
    </div>
  );
}

interface BarValueLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
  format: (v: number) => string;
  /** Text color when drawn inside the bar (must contrast with the bar fill). */
  insideColor: string;
  /** Text color when the bar is too short and the label sits just past its end. */
  outsideColor: string;
}

/**
 * Value label for horizontal bars: drawn inside the bar near its tip when it fits,
 * otherwise just past the end so short bars (e.g. PTP = 1) stay readable.
 */
function BarValueLabel({ x = 0, y = 0, width = 0, height = 0, value, format, insideColor, outsideColor }: BarValueLabelProps) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const text = format(n);
  const bx = Number(x);
  const by = Number(y);
  const bw = Number(width);
  const bh = Number(height);
  // ~6.3px per bold 10.5px glyph plus padding on both sides.
  const fits = bw >= text.length * 6.3 + 12;
  return (
    <text
      x={fits ? bx + bw - 6 : bx + bw + 5}
      y={by + bh / 2}
      dy="0.35em"
      textAnchor={fits ? 'end' : 'start'}
      fill={fits ? insideColor : outsideColor}
      fontSize={10.5}
      fontWeight={700}
      style={{ pointerEvents: 'none' }}
    >
      {text}
    </text>
  );
}

export function AgentPerformanceChart({ data, isDark = false }: AgentChartProps) {
  // Keep every agent in the selected department, ordered by RPC volume.
  const allAgents = useMemo(
    () => [...data].sort((a, b) => b.rpc - a.rpc || b.ptp - a.ptp || a.name.localeCompare(b.name)),
    [data]
  );
  const rateByAgent = useMemo(() => {
    const m = new Map<string, number>();
    allAgents.forEach((a) => m.set(a.name, a.rpc > 0 ? (a.ptp / a.rpc) * 100 : 0));
    return m;
  }, [allAgents]);

  const theme = getChartTheme(isDark);
  const labelOutside = isDark ? '#e2e8f0' : '#334155';
  const formatCount = (v: number) => v.toLocaleString();
  const chartHeight = Math.max(320, allAgents.length * 31 + 80);

  return (
    <ChartCard
      title="Agent RPC to PTP Conversion"
      subtitle={`All ${allAgents.length} available agents • Right Party Contacts converted to PTP`}
    >
      {allAgents.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No agent records for this department filter.
        </div>
      ) : (
        <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allAgents} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={true} vertical={false} />
            <XAxis type="number" stroke={theme.axis} fontSize={12} tick={{ fill: theme.axis }} allowDecimals={false} />
            <YAxis
              dataKey="name"
              type="category"
              stroke={theme.axis}
              fontSize={11}
              width={110}
              tick={{ fill: theme.axis }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tickFormatter={(name: any) => {
                const rate = rateByAgent.get(name);
                return rate === undefined ? name : `${name} (${rate.toFixed(0)}%)`;
              }}
            />
            <Tooltip
              content={<RpcPtpTooltip isDark={isDark} />}
              cursor={{ fill: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(99,102,241,0.07)' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="rpc" fill="#6366f1" name="RPC (Right Party Contact)" radius={[0, 4, 4, 0]} barSize={14}>
              <LabelList
                dataKey="rpc"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => (
                  <BarValueLabel {...props} format={formatCount} insideColor="#ffffff" outsideColor={labelOutside} />
                )}
              />
            </Bar>
            <Bar dataKey="ptp" fill="#f59e0b" name="PTP (Promise to Pay)" radius={[0, 4, 4, 0]} barSize={14}>
              <LabelList
                dataKey="ptp"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => (
                  <BarValueLabel {...props} format={formatCount} insideColor="#422006" outsideColor={labelOutside} />
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

interface ContactTypeChartProps {
  data: ContactTypeStat[];
  isDark?: boolean;
}

export function ContactTypeChart({ data, isDark = false }: ContactTypeChartProps) {
  const theme = getChartTheme(isDark);

  return (
    <ChartCard title="Contact Type Distribution" subtitle="Breakdown of contact outcomes">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="count"
              nameKey="type"
              stroke={isDark ? '#0f172a' : '#ffffff'}
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={theme.tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any, props: any) => [
                `${Number(value).toLocaleString()} (${props?.payload?.percentage?.toFixed(1) || 0}%)`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

interface CompanyChartProps {
  data: CompanyBreakdown[];
  isDark?: boolean;
}

export function CompanyBreakdownChart({ data, isDark = false }: CompanyChartProps) {
  const theme = getChartTheme(isDark);

  return (
    <ChartCard title="Company Breakdown" subtitle="Accounts and overdue portfolio by company">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis dataKey="company" stroke={theme.axis} fontSize={11} tick={{ fill: theme.axis }} />
            <YAxis yAxisId="left" stroke={theme.axis} fontSize={11} tick={{ fill: theme.axis }} />
            <YAxis yAxisId="right" orientation="right" stroke={theme.axis} fontSize={11} tick={{ fill: theme.axis }} />
            <Tooltip
              contentStyle={theme.tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                name === 'count' ? Number(value).toLocaleString() : formatCurrency(Number(value)),
                name === 'count' ? 'Accounts' : 'Overdue',
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Accounts" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="overdue" fill="#f43f5e" name="Overdue" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

interface DepartmentChartProps {
  data: DepartmentStat[];
  isDark?: boolean;
}

export function DepartmentChart({ data, isDark = false }: DepartmentChartProps) {
  const theme = getChartTheme(isDark);

  return (
    <ChartCard title="Department Performance" subtitle="Account volume and debt portfolio by department">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis dataKey="department" stroke={theme.axis} fontSize={12} tick={{ fill: theme.axis }} />
            <YAxis stroke={theme.axis} fontSize={11} tick={{ fill: theme.axis }} />
            <Tooltip
              contentStyle={theme.tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                name === 'count' ? Number(value).toLocaleString() : formatCurrency(Number(value)),
                name === 'count' ? 'Accounts' : 'Overdue',
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="count" fill="#8b5cf6" name="Accounts" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

interface ClientPTPChartProps {
  data: ClientPTPStat[];
  isDark?: boolean;
}

/**
 * PTP Acquired per Client
 * Groups the PTP data by the "Company name" column (client) from the uploaded Excel file.
 */
export function ClientPTPChart({ data, isDark = false }: ClientPTPChartProps) {
  const theme = getChartTheme(isDark);
  const [sortBy, setSortBy] = useState<'ptpCount' | 'ptpAmount'>('ptpAmount');

  const sortLabel = sortBy === 'ptpCount' ? 'PTPs' : 'PTP Amount';
  const formatChartValue = (v: number) =>
    sortBy === 'ptpCount' ? v.toLocaleString() : formatCurrency(v);

  const chartData = useMemo(() => {
    return [...data]
      .filter((d) => d.ptpCount > 0 || d.ptpAmount > 0)
      .sort((a, b) => b[sortBy] - a[sortBy] || b.ptpAmount - a.ptpAmount)
      .slice(0, 10);
  }, [data, sortBy]);

  const sortedTableData = useMemo(
    () => [...data].sort((a, b) => b[sortBy] - a[sortBy] || b.ptpAmount - a.ptpAmount),
    [data, sortBy]
  );

  const totals = useMemo(() => {
    let ptpCount = 0;
    let ptpAmount = 0;
    let ptpPaid = 0;
    data.forEach((d) => {
      ptpCount += d.ptpCount;
      ptpAmount += d.ptpAmount;
      ptpPaid += d.ptpPaid;
    });
    return { ptpCount, ptpAmount, ptpPaid, clients: data.length };
  }, [data]);

  return (
    <ChartCard
      title="PTP Acquired per Client"
      subtitle="Promise-to-Pay volume & amount grouped by Company name"
    >
      {/* Client count / totals strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          {totals.clients} client{totals.clients === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          {totals.ptpCount.toLocaleString()} PTPs
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          {formatCurrency(totals.ptpAmount)} promised
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
          {formatCurrency(totals.ptpPaid)} paid
        </span>
      </div>

      {/* Sort toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rank clients by</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {([
            { id: 'ptpCount', label: 'PTPs' },
            { id: 'ptpAmount', label: 'PTP Amount' },
          ] as const).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={sortBy === option.id}
              onClick={() => setSortBy(option.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-bold transition-all',
                sortBy === option.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Chart and client table ranked by {sortLabel}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center rounded-xl bg-slate-50 text-center dark:bg-slate-800/40">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No PTP acquired in this selection</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            PTP data requires Action result = "Promise to pay" / "Promise to pay (lump sum)"
          </p>
        </div>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 45, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  stroke={theme.axis}
                  fontSize={11}
                  tick={{ fill: theme.axis }}
                  allowDecimals={false}
                  tickFormatter={(v) =>
                    sortBy === 'ptpCount'
                      ? Number(v).toLocaleString()
                      : `₱${(Number(v) / 1000).toFixed(0)}k`
                  }
                />
                <YAxis
                  dataKey="client"
                  type="category"
                  stroke={theme.axis}
                  fontSize={11}
                  width={95}
                  tick={{ fill: theme.axis }}
                  tickFormatter={(v) => shortClientName(String(v))}
                />
                <Tooltip
                  contentStyle={theme.tooltipStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === 'PTP Amount') return [formatCurrency(Number(value)), 'PTP Amount'];
                    if (name === 'PTP Count') return [Number(value).toLocaleString(), 'PTP Count'];
                    return [String(value), String(name)];
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(_label: any, payload: any) => {
                    const item = payload?.[0]?.payload as ClientPTPStat | undefined;
                    if (!item) return '';
                    return `${item.client} — ${item.ptpCount.toLocaleString()} PTPs • ${formatCurrency(item.ptpAmount)} • ${formatCurrency(item.ptpPaid)} paid`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey={sortBy}
                  fill="#10b981"
                  name={sortLabel}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                >
                  <LabelList
                    dataKey={sortBy}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => (
                      <BarValueLabel
                        {...props}
                        format={formatChartValue}
                        insideColor="#ffffff"
                        outsideColor={isDark ? '#e2e8f0' : '#334155'}
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Client breakdown table */}
          <div className="mt-3 max-h-52 overflow-y-auto rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                <tr className="text-left font-bold text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2">Client (Company name)</th>
                  <th className="px-3 py-2 text-right">PTPs</th>
                  <th className="px-3 py-2 text-right">PTP Amount</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedTableData.map((row) => (
                    <tr key={row.client} className="text-slate-700 dark:text-slate-300">
                      <td className="max-w-[150px] truncate px-3 py-1.5 font-semibold" title={row.client}>
                        {row.client}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{row.ptpCount.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.ptpAmount)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-sky-600 dark:text-sky-400">
                        {formatCurrency(row.ptpPaid)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ChartCard>
  );
}

function shortClientName(name: string): string {
  return name.length > 13 ? `${name.slice(0, 12)}…` : name;
}

/** @deprecated Use ClientPTPChart — kept for backward compatibility */
export function PTPStatusChart(_props: { data: PTPStatusStat[]; isDark?: boolean }) {
  return null;
}

interface CallDurationChartProps {
  data: CallDurationBucket[];
  isDark?: boolean;
}

export function CallDurationChart({ data, isDark = false }: CallDurationChartProps) {
  const theme = getChartTheme(isDark);

  return (
    <ChartCard title="Call Duration Distribution" subtitle="Calls bucketed by duration (minutes)">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis dataKey="range" stroke={theme.axis} fontSize={12} tick={{ fill: theme.axis }} />
            <YAxis stroke={theme.axis} fontSize={11} tick={{ fill: theme.axis }} />
            <Tooltip
              contentStyle={theme.tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${Number(value).toLocaleString()} calls`, 'Count']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorCalls)"
              name="Calls"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

interface AgentPTPAmountChartProps {
  data: AgentPerformance[];
  isDark?: boolean;
}

export function AgentPTPAmountChart({ data, isDark = false }: AgentPTPAmountChartProps) {
  const ranked = useMemo(
    () => [...data].sort((a, b) => b.ptpAmount - a.ptpAmount || a.name.localeCompare(b.name)),
    [data]
  );
  const theme = getChartTheme(isDark);
  const labelOutside = isDark ? '#e2e8f0' : '#334155';
  const chartHeight = Math.max(300, ranked.length * 29 + 70);

  return (
    <ChartCard title="Agent PTP Amount" subtitle={`All ${ranked.length} available agents • Total PTP amount promised`}>
      {ranked.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No agent records for this department filter.
        </div>
      ) : (
        <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ranked} layout="vertical" margin={{ top: 5, right: 60, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={true} vertical={false} />
            <XAxis
              type="number"
              stroke={theme.axis}
              fontSize={11}
              tick={{ fill: theme.axis }}
              tickFormatter={(v) => `₱${(Number(v) / 1000).toFixed(0)}k`}
            />
            <YAxis dataKey="name" type="category" stroke={theme.axis} fontSize={11} width={95} tick={{ fill: theme.axis }} />
            <Tooltip
              contentStyle={theme.tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value)), 'PTP Amount']}
            />
            <Bar dataKey="ptpAmount" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16}>
              <LabelList
                dataKey="ptpAmount"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => (
                  <BarValueLabel {...props} format={formatCurrency} insideColor="#422006" outsideColor={labelOutside} />
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

// Backward-compatibility alias
export const AgentOverdueChart = AgentPTPAmountChart;

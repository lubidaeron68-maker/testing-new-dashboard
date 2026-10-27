import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Wallet, Link2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CollectionRecord, DailyCallRecord } from '../types';
import { computeAgentPtpOutstanding } from '../utils/agentPtpOutstanding';

interface AgentPtpOutstandingChartProps {
  records: CollectionRecord[];
  callist: DailyCallRecord[];
  isDark?: boolean;
  callistFileName?: string;
}

const TOP_N = 10;

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(v);
}

function getChartTheme(isDark: boolean) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PtpVsOutstandingTooltip({ active, payload, isDark }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        color: isDark ? '#f8fafc' : '#0f172a',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '10px 14px',
        fontSize: '12px',
      }}
    >
      <p className="mb-1 text-sm font-bold">{d.agent}</p>
      <p>
        <span style={{ color: '#f59e0b' }} className="font-semibold">
          PTP amount:
        </span>{' '}
        {formatCurrency(d.ptpAmount)}
      </p>
      <p>
        <span style={{ color: '#f43f5e' }} className="font-semibold">
          Outstanding balance:
        </span>{' '}
        {formatCurrency(d.outstanding)}
      </p>
      <p className="mt-1 text-[11px] opacity-70">
        {d.ptpCount} PTP{d.ptpCount === 1 ? '' : 's'} • {d.matchedCount} matched in call list
      </p>
    </div>
  );
}

export function AgentPtpOutstandingChart({
  records,
  callist,
  isDark = false,
  callistFileName,
}: AgentPtpOutstandingChartProps) {
  const [showAll, setShowAll] = useState(false);
  const theme = getChartTheme(isDark);

  const rows = useMemo(() => computeAgentPtpOutstanding(records, callist), [records, callist]);

  const totals = useMemo(() => {
    let ptpAmount = 0;
    let outstanding = 0;
    let ptpCount = 0;
    let matchedCount = 0;
    rows.forEach((r) => {
      ptpAmount += r.ptpAmount;
      outstanding += r.outstanding;
      ptpCount += r.ptpCount;
      matchedCount += r.matchedCount;
    });
    return { ptpAmount, outstanding, ptpCount, matchedCount, agents: rows.length };
  }, [rows]);

  const visible = showAll ? rows : rows.slice(0, TOP_N);
  const hasCallist = callist.length > 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-md shadow-rose-500/20">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Overall PTP Amount per Agent vs Outstanding Balance
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Link2 className="h-3.5 w-3.5" />
              Report <span className="font-mono font-semibold">Agreement id</span>
              <span className="text-slate-400">→</span>
              call list <span className="font-mono font-semibold">agreement_rk</span>
              <span className="text-slate-400">·</span>
              balance <span className="font-mono font-semibold">os_current</span>
            </p>
          </div>
        </div>

        {rows.length > TOP_N && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {showAll ? `Show top ${TOP_N}` : `Show all ${rows.length} agents`}
          </button>
        )}
      </div>

      {/* Call-list link status */}
      {!hasCallist ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/60 dark:bg-amber-950/40">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              Daily Call List not loaded
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              Upload a Daily Call List to pull each account's outstanding balance via{' '}
              <span className="font-mono font-semibold">agreement_rk</span>. Until then, every outstanding value is
              ₱0.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900">
            <Link2 className="h-3.5 w-3.5" />
            Linked to: {callistFileName ?? 'Daily Call List'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {totals.matchedCount.toLocaleString()} / {totals.ptpCount.toLocaleString()} PTP accounts matched
          </span>
        </div>
      )}

      {/* Chart */}
      {rows.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl bg-slate-50 text-center dark:bg-slate-800/40">
          <Wallet className="h-9 w-9 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">No PTP records in this file</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            This chart appears once the report has Promise to pay rows
          </p>
        </div>
      ) : (
        <div style={{ height: Math.max(320, visible.length * 34 + 90) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visible} layout="vertical" margin={{ top: 5, right: 70, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={true} vertical={false} />
              <XAxis
                type="number"
                stroke={theme.axis}
                fontSize={11}
                tick={{ fill: theme.axis }}
                tickFormatter={(v) => `₱${(Number(v) / 1000).toFixed(0)}k`}
              />
              <YAxis
                dataKey="agent"
                type="category"
                stroke={theme.axis}
                fontSize={11}
                width={140}
                tick={{ fill: theme.axis }}
              />
              <Tooltip content={<PtpVsOutstandingTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="ptpAmount"
                fill="#f59e0b"
                name="PTP amount"
                radius={[0, 4, 4, 0]}
                barSize={13}
              />
              <Bar
                dataKey="outstanding"
                fill="#f43f5e"
                name="Outstanding balance"
                radius={[0, 4, 4, 0]}
                barSize={13}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Totals footer */}
      {rows.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Agents with PTP
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">{totals.agents}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total PTP amount
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {formatCurrency(totals.ptpAmount)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total matched outstanding
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(totals.outstanding)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recovery ratio
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {totals.outstanding > 0 ? ((totals.ptpAmount / totals.outstanding) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

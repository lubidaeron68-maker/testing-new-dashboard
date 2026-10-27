import { useMemo, useState, useEffect } from 'react';
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
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowLeftRight,
  GitCompareArrows,
  Trophy,
} from 'lucide-react';
import type { Dataset, CollectionRecord } from '../types';
import { MultiDepartmentFilter } from './MultiDepartmentFilter';
import { processData } from '../utils/dataProcessor';
import { cn } from '../utils/cn';

interface CompareViewProps {
  datasets: Dataset[];
  isDark: boolean;
}

function formatNumber(v: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(v));
}
function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}
function formatPct(v: number): string {
  return `${v.toFixed(1)}%`;
}
function formatMin(v: number): string {
  return `${v.toFixed(1)} min`;
}
function shortName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + '…';
}

interface DeltaInfo {
  diff: number;
  pctChange: number | null;
}

function getDelta(a: number, b: number): DeltaInfo {
  const diff = b - a;
  const pctChange = a !== 0 ? (diff / Math.abs(a)) * 100 : b !== 0 ? 100 : 0;
  return { diff, pctChange };
}

function DeltaBadge({
  delta,
  format,
  invert = false,
  suffix = '',
}: {
  delta: DeltaInfo;
  format: (v: number) => string;
  invert?: boolean;
  suffix?: string;
}) {
  const isZero = Math.abs(delta.diff) < 0.0001;
  if (isZero) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Minus className="h-3 w-3" /> No change
      </span>
    );
  }
  const positive = delta.diff > 0;
  // invert: e.g. No Contact Rate — down is good
  const good = invert ? !positive : positive;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        good
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      )}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? '+' : ''}
      {format(delta.diff)}
      {suffix}
      {delta.pctChange !== null && (
        <span className="opacity-70">
          ({positive ? '+' : ''}
          {delta.pctChange.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

function CompareCard({
  title,
  aLabel,
  bLabel,
  aColor,
  bColor,
  aValue,
  bValue,
  delta,
  format,
  invert,
}: {
  title: string;
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
  aValue: number;
  bValue: number;
  delta: DeltaInfo;
  format: (v: number) => string;
  invert?: boolean;
}) {
  const winner = Math.abs(delta.diff) < 0.0001 ? null : delta.diff > 0 ? 'B' : 'A';
  // For inverted metrics (lower better), flip winner
  const goodWinner = invert ? (winner === 'A' ? 'B' : winner === 'B' ? 'A' : null) : winner;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors dark:bg-slate-900/95 dark:ring-slate-800">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: aColor }} />
            <span className="truncate" title={aLabel}>
              {shortName(aLabel)}
            </span>
          </span>
          <span className="flex items-center gap-1 text-lg font-extrabold text-slate-900 dark:text-white">
            {goodWinner === 'A' && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
            {format(aValue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bColor }} />
            <span className="truncate" title={bLabel}>
              {shortName(bLabel)}
            </span>
          </span>
          <span className="flex items-center gap-1 text-lg font-extrabold text-slate-900 dark:text-white">
            {goodWinner === 'B' && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
            {format(bValue)}
          </span>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
        <DeltaBadge delta={delta} format={(v) => format(Math.abs(v))} invert={invert} />
      </div>
    </div>
  );
}

export function CompareView({ datasets, isDark }: CompareViewProps) {
  const [idA, setIdA] = useState<string>(datasets[0]?.id ?? '');
  const [idB, setIdB] = useState<string>(datasets[1]?.id ?? '');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  // Keep selections valid when datasets are added/removed
  useEffect(() => {
    if (!datasets.find((d) => d.id === idA)) setIdA(datasets[0]?.id ?? '');
    if (!datasets.find((d) => d.id === idB)) {
      const fallback = datasets.find((d) => d.id !== (datasets.find((x) => x.id === idA)?.id ?? datasets[0]?.id));
      setIdB(fallback?.id ?? datasets[1]?.id ?? datasets[0]?.id ?? '');
    }
  }, [datasets, idA, idB]);

  const dsA = datasets.find((d) => d.id === idA) ?? datasets[0];
  const dsB = datasets.find((d) => d.id === idB) ?? datasets[1] ?? datasets[0];

  // Combined departments across both selected datasets for filtering
  const allDepartments = useMemo(() => {
    if (!dsA || !dsB) return [];
    return Array.from(new Set([...dsA.data.departments, ...dsB.data.departments])).sort();
  }, [dsA, dsB]);

  // Reset department filter when either compared dataset changes
  useEffect(() => {
    setSelectedDepts([]);
  }, [idA, idB]);

  // Compute effective dashboard data for dataset A (filtered by selected departments if any)
  const dataA = useMemo(() => {
    if (!dsA) return null;
    if (selectedDepts.length === 0 || selectedDepts.length === allDepartments.length) {
      return dsA.data;
    }
    const deptSet = new Set(selectedDepts);
    const filteredRecords: CollectionRecord[] = dsA.data.records.filter((r) => deptSet.has(r.department));
    return processData(filteredRecords);
  }, [dsA, selectedDepts, allDepartments]);

  // Compute effective dashboard data for dataset B (filtered by selected departments if any)
  const dataB = useMemo(() => {
    if (!dsB) return null;
    if (selectedDepts.length === 0 || selectedDepts.length === allDepartments.length) {
      return dsB.data;
    }
    const deptSet = new Set(selectedDepts);
    const filteredRecords: CollectionRecord[] = dsB.data.records.filter((r) => deptSet.has(r.department));
    return processData(filteredRecords);
  }, [dsB, selectedDepts, allDepartments]);

  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontSize: '12px',
  };

  const swap = () => {
    setIdA(dsB.id);
    setIdB(dsA.id);
  };

  const merged = useMemo(() => {
    if (!dataA || !dataB) return null;

    const mergeCounts = (
      aList: { [k: string]: number }[],
      bList: { [k: string]: number }[],
      keyField: string
    ) => {
      const map = new Map<string, { name: string; A: number; B: number }>();
      const getKey = (o: Record<string, unknown>) => String(o[keyField]);
      aList.forEach((o) => {
        const k = getKey(o as Record<string, unknown>);
        map.set(k, { name: k, A: Number((o as Record<string, unknown>).count) || 0, B: 0 });
      });
      bList.forEach((o) => {
        const k = getKey(o as Record<string, unknown>);
        const e = map.get(k);
        if (e) e.B = Number((o as Record<string, unknown>).count) || 0;
        else map.set(k, { name: k, A: 0, B: Number((o as Record<string, unknown>).count) || 0 });
      });
      return Array.from(map.values()).sort((x, y) => y.A + y.B - (x.A + x.B));
    };

    // Agents: union by name with RPC, PTP, PTP Amount, and Conversion rate per side
    const agentMap = new Map<
      string,
      { name: string; rpcA: number; ptpA: number; ptpAmtA: number; rpcB: number; ptpB: number; ptpAmtB: number }
    >();
    dataA.agentPerformance.forEach((a) => {
      agentMap.set(a.name, {
        name: a.name,
        rpcA: a.rpc,
        ptpA: a.ptp,
        ptpAmtA: a.ptpAmount,
        rpcB: 0,
        ptpB: 0,
        ptpAmtB: 0,
      });
    });
    dataB.agentPerformance.forEach((b) => {
      const e = agentMap.get(b.name);
      if (e) {
        e.rpcB = b.rpc;
        e.ptpB = b.ptp;
        e.ptpAmtB = b.ptpAmount;
      } else {
        agentMap.set(b.name, {
          name: b.name,
          rpcA: 0,
          ptpA: 0,
          ptpAmtA: 0,
          rpcB: b.rpc,
          ptpB: b.ptp,
          ptpAmtB: b.ptpAmount,
        });
      }
    });
    const agents = Array.from(agentMap.values())
      .map((a) => ({
        ...a,
        convA: a.rpcA > 0 ? (a.ptpA / a.rpcA) * 100 : 0,
        convB: a.rpcB > 0 ? (a.ptpB / a.rpcB) * 100 : 0,
        total: a.rpcA + a.rpcB,
      }))
      .sort((x, y) => y.total - x.total)
      .slice(0, 10);

    return {
      contactTypes: mergeCounts(
        dataA.contactTypeStats as unknown as { [k: string]: number }[],
        dataB.contactTypeStats as unknown as { [k: string]: number }[],
        'type'
      ),
      ptpStatus: mergeCounts(
        dataA.ptpStatusStats as unknown as { [k: string]: number }[],
        dataB.ptpStatusStats as unknown as { [k: string]: number }[],
        'status'
      ),
      // PTP acquired per Client (Company name) — amount view
      clientPtpAmount: (() => {
        const map = new Map<string, { name: string; A: number; B: number }>();
        dataA.clientPtpStats.forEach((c) => {
          map.set(c.client, { name: c.client, A: c.ptpAmount, B: 0 });
        });
        dataB.clientPtpStats.forEach((c) => {
          const e = map.get(c.client);
          if (e) e.B = c.ptpAmount;
          else map.set(c.client, { name: c.client, A: 0, B: c.ptpAmount });
        });
        return Array.from(map.values()).sort((x, y) => y.A + y.B - (x.A + x.B));
      })(),
      clientPtpRows: (() => {
        const map = new Map<
          string,
          { client: string; countA: number; amtA: number; paidA: number; countB: number; amtB: number; paidB: number }
        >();
        dataA.clientPtpStats.forEach((c) => {
          map.set(c.client, {
            client: c.client,
            countA: c.ptpCount,
            amtA: c.ptpAmount,
            paidA: c.ptpPaid,
            countB: 0,
            amtB: 0,
            paidB: 0,
          });
        });
        dataB.clientPtpStats.forEach((c) => {
          const e = map.get(c.client);
          if (e) {
            e.countB = c.ptpCount;
            e.amtB = c.ptpAmount;
            e.paidB = c.ptpPaid;
          } else {
            map.set(c.client, {
              client: c.client,
              countA: 0,
              amtA: 0,
              paidA: 0,
              countB: c.ptpCount,
              amtB: c.ptpAmount,
              paidB: c.ptpPaid,
            });
          }
        });
        return Array.from(map.values()).sort((x, y) => y.amtA + y.amtB - (x.amtA + x.amtB)).slice(0, 10);
      })(),
      departments: mergeCounts(
        dataA.departmentStats as unknown as { [k: string]: number }[],
        dataB.departmentStats as unknown as { [k: string]: number }[],
        'department'
      ),
      companies: mergeCounts(
        dataA.companyBreakdown as unknown as { [k: string]: number }[],
        dataB.companyBreakdown as unknown as { [k: string]: number }[],
        'company'
      ).slice(0, 10),
      durations: mergeCounts(
        dataA.callDurationBuckets as unknown as { [k: string]: number }[],
        dataB.callDurationBuckets as unknown as { [k: string]: number }[],
        'range'
      ),
      agents,
    };
  }, [dataA, dataB]);

  if (!dsA || !dsB || !dataA || !dataB || !merged) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <GitCompareArrows className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Not enough files to compare</p>
        <p className="text-sm text-slate-500">Dump at least two Excel files to unlock comparison.</p>
      </div>
    );
  }

  const kpiA = dataA.kpi;
  const kpiB = dataB.kpi;
  const labelA = `${dsA.fileName} (${dsA.uploadedLabel})`;
  const labelB = `${dsB.fileName} (${dsB.uploadedLabel})`;

  // Updated KPI definitions per user request
  const kpiDefs = [
    { title: 'Total FIS Taggings(w/redial)', a: kpiA.totalAccounts, b: kpiB.totalAccounts, format: formatNumber },
    { title: 'Total unique accounts tagged', a: kpiA.uniqueAccounts, b: kpiB.uniqueAccounts, format: formatNumber },
    { title: 'Avg Call Duration', a: kpiA.avgCallDuration, b: kpiB.avgCallDuration, format: formatMin },
    { title: "PTP'S", a: kpiA.totalPTP, b: kpiB.totalPTP, format: formatNumber },
    { title: 'Number of RPC', a: kpiA.rpcCount, b: kpiB.rpcCount, format: formatNumber },
    { title: 'No Contact Rate', a: kpiA.noContactRate, b: kpiB.noContactRate, format: formatPct, invert: true },
  ];

  const renderCompareBar = (
    title: string,
    subtitle: string,
    data: { name: string; A: number; B: number }[],
    layout: 'h' | 'v' = 'v'
  ) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {layout === 'v' ? (
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={axisStroke}
                fontSize={10}
                tick={{ fill: axisStroke }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke={axisStroke} fontSize={11} tick={{ fill: axisStroke }} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  Number(value).toLocaleString(),
                  name === 'A' ? shortName(dsA.fileName) : shortName(dsB.fileName),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => (v === 'A' ? `A: ${shortName(dsA.fileName)}` : `B: ${shortName(dsB.fileName)}`)}
              />
              <Bar dataKey="A" fill={dsA.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="B" fill={dsB.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={true} vertical={false} />
              <XAxis type="number" stroke={axisStroke} fontSize={11} tick={{ fill: axisStroke }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} width={85} tick={{ fill: axisStroke }} />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  Number(value).toLocaleString(),
                  name === 'A' ? shortName(dsA.fileName) : shortName(dsB.fileName),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => (v === 'A' ? `A: ${shortName(dsA.fileName)}` : `B: ${shortName(dsB.fileName)}`)}
              />
              <Bar dataKey="A" fill={dsA.color} radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="B" fill={dsB.color} radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* File pickers and Departments Filter Header */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <GitCompareArrows className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">File vs File Comparison</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pick any two dumped files — deltas are computed as <span className="font-bold">B − A</span>
              </p>
            </div>
          </div>

          {/* Department Filter on the comparison tab */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Department Filter</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {selectedDepts.length === 0 || selectedDepts.length === allDepartments.length
                  ? `All ${allDepartments.length} depts`
                  : `${selectedDepts.length} selected`}
              </span>
            </div>
            <MultiDepartmentFilter
              departments={allDepartments}
              selected={selectedDepts}
              onChange={setSelectedDepts}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {/* A selector */}
          <label className="flex-1">
            <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-extrabold text-white" style={{ backgroundColor: dsA.color }}>
                A
              </span>
              Baseline file
            </span>
            <select
              value={dsA.id}
              onChange={(e) => setIdA(e.target.value)}
              className="w-full rounded-xl border-2 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-colors dark:bg-slate-800 dark:text-slate-100"
              style={{ borderColor: dsA.color }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName} — {d.uploadedLabel} ({d.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
            <span className="mt-1 block truncate text-[11px] text-slate-400">
              {dsA.dateRangeLabel ? `Data: ${dsA.dateRangeLabel}` : dsA.uploadedLabel} • {dataA.records.length.toLocaleString()} records{selectedDepts.length > 0 && selectedDepts.length < allDepartments.length ? ' (dept filtered)' : ''}
            </span>
          </label>

          <button
            type="button"
            onClick={swap}
            title="Swap A and B"
            className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition-all hover:rotate-180 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>

          {/* B selector */}
          <label className="flex-1">
            <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-extrabold text-white" style={{ backgroundColor: dsB.color }}>
                B
              </span>
              Challenger file
            </span>
            <select
              value={dsB.id}
              onChange={(e) => setIdB(e.target.value)}
              className="w-full rounded-xl border-2 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-colors dark:bg-slate-800 dark:text-slate-100"
              style={{ borderColor: dsB.color }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName} — {d.uploadedLabel} ({d.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
            <span className="mt-1 block truncate text-[11px] text-slate-400">
              {dsB.dateRangeLabel ? `Data: ${dsB.dateRangeLabel}` : dsB.uploadedLabel} • {dataB.records.length.toLocaleString()} records{selectedDepts.length > 0 && selectedDepts.length < allDepartments.length ? ' (dept filtered)' : ''}
            </span>
          </label>
        </div>

        {dsA.id === dsB.id && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            You selected the same file twice — pick two different files to see real deltas.
          </p>
        )}
      </div>

      {/* KPI deltas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiDefs.map((k) => (
          <CompareCard
            key={k.title}
            title={k.title}
            aLabel={labelA}
            bLabel={labelB}
            aColor={dsA.color}
            bColor={dsB.color}
            aValue={k.a}
            bValue={k.b}
            delta={getDelta(k.a, k.b)}
            format={k.format}
            invert={(k as { invert?: boolean }).invert}
          />
        ))}
      </div>

      {/* Distribution comparisons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderCompareBar('Contact Type: A vs B', 'Call outcomes per file', merged.contactTypes)}
        {renderCompareBar('PTP Status: A vs B', 'Promise-to-pay funnel per file', merged.ptpStatus)}
      </div>

      {/* PTP acquired per Client, file vs file */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {renderCompareBar(
          'PTP Acquired per Client: A vs B',
          'PTP amount grouped by Company name from each file',
          merged.clientPtpAmount
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Client PTP Details: A vs B</h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            PTP count, amount and paid totals per client (Company name)
          </p>
          <div className="max-h-72 overflow-auto rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                <tr className="text-left font-bold text-slate-500 dark:text-slate-400">
                  <th className="px-2.5 py-2">Client</th>
                  <th className="px-2.5 py-2 text-right" style={{ color: dsA.color }}>
                    A PTPs
                  </th>
                  <th className="px-2.5 py-2 text-right" style={{ color: dsA.color }}>
                    A Amount
                  </th>
                  <th className="px-2.5 py-2 text-right" style={{ color: dsB.color }}>
                    B PTPs
                  </th>
                  <th className="px-2.5 py-2 text-right" style={{ color: dsB.color }}>
                    B Amount
                  </th>
                  <th className="px-2.5 py-2 text-right">Δ Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {merged.clientPtpRows.map((c) => {
                  const diff = c.amtB - c.amtA;
                  return (
                    <tr key={c.client} className="text-slate-700 dark:text-slate-300">
                      <td className="max-w-[130px] truncate px-2.5 py-1.5 font-semibold" title={c.client}>
                        {c.client}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{c.countA.toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{formatCurrency(c.amtA)}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{c.countB.toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{formatCurrency(c.amtB)}</td>
                      <td className="px-2.5 py-1.5 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                            Math.abs(diff) < 0.5
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : diff > 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          )}
                        >
                          {diff > 0 ? '+' : ''}
                          {formatCurrency(diff)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderCompareBar('Department Volume: A vs B', 'Accounts handled per department', merged.departments)}
        {renderCompareBar('Call Duration: A vs B', 'Calls per duration bucket', merged.durations)}
      </div>
      {renderCompareBar('Company Mix: A vs B (Top 10)', 'Accounts per company', merged.companies, 'h')}

      {/* Agent Face-off table with RPC, PTP, PTP Amount, and Conversion */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Agent RPC to PTP Face-off (Top 10 by RPC)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Same agents, two files — comparing RPC, PTP count, PTP amount, and conversion rate
            </p>
          </div>
          {selectedDepts.length > 0 && selectedDepts.length < allDepartments.length && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {selectedDepts.length} department{selectedDepts.length > 1 ? 's' : ''} filtered
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-2 text-left">Agent</th>
                <th className="px-3 py-2 text-right" style={{ color: dsA.color }}>
                  A RPC
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsA.color }}>
                  A PTP
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsA.color }}>
                  A PTP Amt
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsA.color }}>
                  A Conv%
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsB.color }}>
                  B RPC
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsB.color }}>
                  B PTP
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsB.color }}>
                  B PTP Amt
                </th>
                <th className="px-3 py-2 text-right" style={{ color: dsB.color }}>
                  B Conv%
                </th>
                <th className="px-3 py-2 text-right">Δ Conv (pp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {merged.agents.map((a) => {
                const dConv = a.convB - a.convA;
                return (
                  <tr key={a.name} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="max-w-[160px] truncate px-3 py-2 font-semibold text-slate-800 dark:text-slate-100" title={a.name}>
                      {a.name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.rpcA.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.ptpA.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-xs text-slate-600 dark:text-slate-300">{formatCurrency(a.ptpAmtA)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                      {a.convA.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.rpcB.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.ptpB.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-xs text-slate-600 dark:text-slate-300">{formatCurrency(a.ptpAmtB)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                      {a.convB.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                          Math.abs(dConv) < 0.05
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            : dConv > 0
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        )}
                      >
                        {dConv > 0 ? <ArrowUpRight className="h-3 w-3" /> : dConv < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {dConv > 0 ? '+' : ''}
                        {dConv.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

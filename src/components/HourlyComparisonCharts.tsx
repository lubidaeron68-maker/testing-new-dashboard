import { useState, useMemo } from 'react';
import { Clock, Zap } from 'lucide-react';
import type { CollectionRecord, KPIData } from '../types';
import { cn } from '../utils/cn';
import {
  parseHourFromExecutionTime,
  get12HourHourLabel,
  convertTo12HourFormat,
} from '../utils/dateFormatter';
import {
  HourlyCategoryChart,
  OVERALL_KEY,
  type CategoryOption,
  type HourlyPoint,
} from './HourlyCategoryChart';
import { MultiDepartmentFilter } from './MultiDepartmentFilter';
import { KPICards } from './KPICards';
import { computeKPIs } from '../utils/dataProcessor';

// High-vibrancy color palette that pops on both light and dark themes
const CATEGORY_COLORS = [
  '#6366f1', // Electric Indigo
  '#10b981', // Neon Emerald
  '#f59e0b', // Radiant Amber
  '#f43f5e', // Hot Coral / Rose
  '#8b5cf6', // Vivid Purple
  '#06b6d4', // Bright Cyan
  '#ec4899', // Vivid Pink
  '#84cc16', // Lime Green
  '#f97316', // Sunset Orange
  '#14b8a6', // Bright Teal
  '#a855f7', // Deep Violet
  '#38bdf8', // Sky Blue
  '#eab308', // Golden Yellow
  '#fb7185', // Soft Rose
  '#e879f9', // Fuchsia
  '#22c55e', // Fresh Green
];

// Standard operational hours covering morning through late night (8 AM to 11 PM)
const BASE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function normalizeContactType(type: string): string {
  const t = type.toLowerCase().trim();
  if (t.includes('right part') || t.includes('rpc') || t.includes('right party')) return 'Right Party';
  if (t.includes('partial')) return 'Partial Contact';
  if (t.includes('no ans') || t.includes('noans')) return 'No Answer';
  if (t.includes('no contact') || t.includes('no conta') || t.includes('nocontact')) return 'No Contact';
  if (t.includes('left mess') || t.includes('voicemail') || t.includes('vm') || t.includes('voice mail')) return 'Left Message';
  if (t.includes('drop') || t.includes('dropped')) return 'Call Drop';
  if (t.includes('callback') || t.includes('call back')) return 'Callback';
  if (t.includes('refuse')) return 'Refuse to Pay';
  if (t.includes('wrong')) return 'Wrong Number';
  if (t.includes('busy')) return 'Busy';
  return type || 'Other';
}

function normalizeActionResult(result: string): string {
  const r = result.toLowerCase().trim();
  if (r.includes('success') || r.includes('contact') || r.includes('spoke')) return 'Successful';
  if (r.includes('call drop') || r.includes('dropped') || r.includes('drop')) return 'Call Drop';
  if (r.includes('no ans') || r.includes('noans') || r.includes('ring')) return 'No Answer';
  if (r.includes('busy')) return 'Busy';
  if (r.includes('voicemail') || r.includes('voice mail') || r.includes('vm') || r.includes('message') || r.includes('left mess')) return 'Left Message';
  if (r.includes('callback') || r.includes('call back')) return 'Callback';
  if (r.includes('refuse') || r.includes('decline')) return 'Refused';
  if (r.includes('wrong') || r.includes('disconnect')) return 'Wrong Number';
  if (r.includes('silence') || r.includes('no response') || r.includes('no respon')) return 'Silence';
  if (r.includes('ptp') || r.includes('promised') || r.includes('promise')) return 'PTP Promised';
  if (r.includes('paid') || r.includes('payment')) return 'Payment Made';
  if (r.includes('un erfolg') || r.includes('unsuccess')) return 'Unsuccessful';
  if (r.includes('will inform') || r.includes('follow up') || r.includes('forgot')) return 'Follow Up';
  return result || 'Other';
}

// hour -> category -> number of calls
type HourCategoryMap = Map<number, Map<string, number>>;

interface DeptAggregate {
  ct: HourCategoryMap;
  ar: HourCategoryMap;
}

function bump(map: HourCategoryMap, hour: number, category: string, by = 1) {
  let inner = map.get(hour);
  if (!inner) {
    inner = new Map();
    map.set(hour, inner);
  }
  inner.set(category, (inner.get(category) || 0) + by);
}

function mergeInto(target: HourCategoryMap, source: HourCategoryMap) {
  source.forEach((inner, hour) => inner.forEach((count, category) => bump(target, hour, category, count)));
}

interface HourlyRowSummary {
  hour: number;
  label12Hour: string;
  totalCalls: number;
  topContactType: string;
  topCTCount: number;
  topActionResult: string;
  topARCount: number;
  isPeak: boolean;
}

interface HourlyComparisonChartsProps {
  records: CollectionRecord[];
  departments: string[];
  isDark?: boolean;
  defaultKpi?: KPIData;
  selectedDepts?: string[];
  onSelectedDeptsChange?: (selected: string[]) => void;
}

export function HourlyComparisonCharts({
  records,
  departments,
  isDark = false,
  defaultKpi,
  selectedDepts: controlledDepts,
  onSelectedDeptsChange,
}: HourlyComparisonChartsProps) {
  // Support multiple selected departments at a time. Empty array means ALL.
  const [internalDepts, setInternalDepts] = useState<string[]>([]);
  const selectedDepts = controlledDepts !== undefined ? controlledDepts : internalDepts;
  const setSelectedDepts = onSelectedDeptsChange ?? setInternalDepts;

  // Pass 1: Indexed by department once per uploaded records set
  const base = useMemo(() => {
    const byDept = new Map<string, DeptAggregate>();
    const ctNames = new Set<string>();
    const arNames = new Set<string>();
    const hours = new Set<number>(BASE_HOURS);
    const ctCache = new Map<string, string>();
    const arCache = new Map<string, string>();
    let sampleRaw = '';

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const hour = parseHourFromExecutionTime(r.executionTime);
      if (hour === null) continue;

      if (!sampleRaw) sampleRaw = r.executionTime;
      hours.add(hour);

      let ct = ctCache.get(r.contactType);
      if (ct === undefined) {
        ct = normalizeContactType(r.contactType);
        ctCache.set(r.contactType, ct);
      }
      let ar = arCache.get(r.actionResult);
      if (ar === undefined) {
        ar = normalizeActionResult(r.actionResult);
        arCache.set(r.actionResult, ar);
      }
      ctNames.add(ct);
      arNames.add(ar);

      const dept = r.department || 'Unknown';
      let agg = byDept.get(dept);
      if (!agg) {
        agg = { ct: new Map(), ar: new Map() };
        byDept.set(dept, agg);
      }
      bump(agg.ct, hour, ct);
      bump(agg.ar, hour, ar);
    }

    return {
      byDept,
      ctNames: Array.from(ctNames).sort(),
      arNames: Array.from(arNames).sort(),
      hours: Array.from(hours).sort((a, b) => a - b),
      sampleRaw,
    };
  }, [records]);

  // Compute filtered records for KPI cards based on multi-selected departments
  const filteredRecords = useMemo(() => {
    if (selectedDepts.length === 0 || selectedDepts.length === departments.length) {
      return records;
    }
    const deptSet = new Set(selectedDepts);
    return records.filter((r) => deptSet.has(r.department));
  }, [records, selectedDepts, departments]);

  // Re-compute KPIs whenever department selection changes
  const departmentKpi = useMemo(() => {
    if (selectedDepts.length === 0 && defaultKpi) {
      return defaultKpi;
    }
    return computeKPIs(filteredRecords);
  }, [filteredRecords, selectedDepts, defaultKpi]);

  // Pass 2: Merge for the selected departments
  const view = useMemo(() => {
    const ct: HourCategoryMap = new Map();
    const ar: HourCategoryMap = new Map();

    const isAll = selectedDepts.length === 0 || selectedDepts.length === departments.length;

    if (isAll) {
      base.byDept.forEach((agg) => {
        mergeInto(ct, agg.ct);
        mergeInto(ar, agg.ar);
      });
    } else {
      selectedDepts.forEach((dept) => {
        const agg = base.byDept.get(dept);
        if (agg) {
          mergeInto(ct, agg.ct);
          mergeInto(ar, agg.ar);
        }
      });
    }

    const buildSeries = (hourMap: HourCategoryMap, allNames: string[]) => {
      const totals = new Map<string, number>();
      hourMap.forEach((inner) => inner.forEach((n, cat) => totals.set(cat, (totals.get(cat) || 0) + n)));

      const options: CategoryOption[] = Array.from(totals.entries())
        .map(([name, total]) => ({
          name,
          total,
          color: CATEGORY_COLORS[allNames.indexOf(name) % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

      const data: HourlyPoint[] = base.hours.map((hour) => {
        const inner = hourMap.get(hour);
        const point: HourlyPoint = { hour: get12HourHourLabel(hour), hourNum: hour };
        let sum = 0;
        for (const option of options) {
          const value = inner?.get(option.name) || 0;
          point[option.name] = value;
          sum += value;
        }
        point[OVERALL_KEY] = sum;
        return point;
      });

      return { options, data };
    };

    const contactSeries = buildSeries(ct, base.ctNames);
    const actionSeries = buildSeries(ar, base.arNames);

    // Hourly counts for summary
    const hourlyCounts = new Map<number, number>();
    ct.forEach((inner, hour) => {
      let sum = 0;
      inner.forEach((n) => (sum += n));
      hourlyCounts.set(hour, sum);
    });

    let totalCalls = 0;
    let maxHour = 10;
    let maxCount = 0;
    hourlyCounts.forEach((count, hour) => {
      totalCalls += count;
      if (count > maxCount) {
        maxCount = count;
        maxHour = hour;
      }
    });

    const topOf = (inner?: Map<string, number>) => {
      let name = '-';
      let count = 0;
      inner?.forEach((c, cat) => {
        if (c > count) {
          name = cat;
          count = c;
        }
      });
      return { name, count };
    };

    const summaryRows: HourlyRowSummary[] = base.hours.map((hour) => {
      const topCT = topOf(ct.get(hour));
      const topAR = topOf(ar.get(hour));
      return {
        hour,
        label12Hour: get12HourHourLabel(hour),
        totalCalls: hourlyCounts.get(hour) || 0,
        topContactType: topCT.name,
        topCTCount: topCT.count,
        topActionResult: topAR.name,
        topARCount: topAR.count,
        isPeak: hour === maxHour && maxCount > 0,
      };
    });

    return {
      totalCalls,
      peakHour: { label: get12HourHourLabel(maxHour), count: maxCount },
      contactSeries,
      actionSeries,
      summaryRows,
    };
  }, [base, selectedDepts, departments]);

  const sampleExecutionExample = base.sampleRaw
    ? convertTo12HourFormat(base.sampleRaw)
    : '21-10-2026 10:01:10 PM';

  // Scope label supporting multiple selections
  let scopeLabel = 'All departments';
  if (selectedDepts.length === 1) {
    scopeLabel = `Dept: ${selectedDepts[0]}`;
  } else if (selectedDepts.length > 1 && selectedDepts.length < departments.length) {
    scopeLabel = `${selectedDepts.length} departments selected`;
  }

  return (
    <div className="space-y-6">
      {/* Department Filter & Summary Header */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Hourly Call Distribution</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-800">
                <Zap className="h-3 w-3" /> 12-Hour Analytics
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {view.totalCalls.toLocaleString()} calls analyzed • Peak hour:{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {view.peakHour.label} ({view.peakHour.count.toLocaleString()} calls)
              </span>{' '}
              • Formatted: <span className="font-mono text-slate-700 dark:text-slate-300">{sampleExecutionExample}</span>
            </p>
          </div>
        </div>

        {/* Multi-Department Filter Dropdown */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Department Scope</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {selectedDepts.length === 0 || selectedDepts.length === departments.length
                ? `All ${departments.length} depts`
                : `${selectedDepts.length} selected`}
            </span>
          </div>
          <MultiDepartmentFilter
            departments={departments}
            selected={selectedDepts}
            onChange={setSelectedDepts}
          />
        </div>
      </div>

      {/* KPI Cards: Dynamically reflect the filtered department records */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {selectedDepts.length === 0 || selectedDepts.length === departments.length
              ? 'All Departments Metrics'
              : `${scopeLabel} Metrics (${filteredRecords.length.toLocaleString()} accounts)`}
          </span>
          {selectedDepts.length > 0 && selectedDepts.length < departments.length && (
            <button
              type="button"
              onClick={() => setSelectedDepts([])}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Reset to All
            </button>
          )}
        </div>
        <KPICards kpi={departmentKpi} />
      </div>

      {/* Two hourly charts, each with its own Overall + individual filter bar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HourlyCategoryChart
          title="Contact Type by Hour (12-Hour Format)"
          scopeLabel={scopeLabel}
          itemLabelPlural="contact types"
          badgeClass="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
          data={view.contactSeries.data}
          categories={view.contactSeries.options}
          isDark={isDark}
          gradientId="overallGradientContactType"
        />
        <HourlyCategoryChart
          title="Action Result by Hour (12-Hour Format)"
          scopeLabel={scopeLabel}
          itemLabelPlural="action results"
          badgeClass="bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300"
          data={view.actionSeries.data}
          categories={view.actionSeries.options}
          isDark={isDark}
          gradientId="overallGradientActionResult"
        />
      </div>

      {/* Hourly Call Volume Summary Table */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Hourly Call Volume Summary (12-Hour Schedule)</h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">Showing all operational hours</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-2 text-left">12-Hour Format</th>
                <th className="px-3 py-2 text-left">24-Hour Military</th>
                <th className="px-3 py-2 text-right">Total Calls</th>
                <th className="px-3 py-2 text-right">Top Contact Type</th>
                <th className="px-3 py-2 text-right">Top Action Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {view.summaryRows.map((row) => {
                if (row.totalCalls === 0) return null;
                return (
                  <tr
                    key={row.hour}
                    className={cn(
                      'transition-colors',
                      row.isPeak
                        ? 'bg-indigo-50/70 font-semibold dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{row.label12Hour}</span>
                      {row.isPeak && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300">
                          ★ Peak Hour
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {String(row.hour).padStart(2, '0')}:00:00
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                      {row.totalCalls.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                      {row.topContactType !== '-' ? `${row.topContactType} (${row.topCTCount.toLocaleString()})` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                      {row.topActionResult !== '-' ? `${row.topActionResult} (${row.topARCount.toLocaleString()})` : '-'}
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

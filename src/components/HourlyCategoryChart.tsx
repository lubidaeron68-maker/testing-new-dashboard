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
  LabelList,
} from 'recharts';
import { Check, Filter, Layers } from 'lucide-react';
import { cn } from '../utils/cn';

/** Key used for the combined "Overall" series inside every hourly data point. */
export const OVERALL_KEY = '__overall';

export interface HourlyPoint {
  hour: string;
  hourNum: number;
  [key: string]: string | number;
}

export interface CategoryOption {
  name: string;
  /** Stable color so a category keeps its color no matter what is filtered. */
  color: string;
  /** Total calls for this category in the current department scope. */
  total: number;
}

interface HourlyCategoryChartProps {
  title: string;
  scopeLabel: string;
  /** Plural noun used in the UI, e.g. "contact types" / "action results". */
  itemLabelPlural: string;
  badgeClass: string;
  data: HourlyPoint[];
  /** Categories that actually have calls, ordered by volume (highest first). */
  categories: CategoryOption[];
  isDark: boolean;
  /** Unique per chart so the two SVG gradients never collide. */
  gradientId: string;
}

interface ChipProps {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  isOverall?: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, active, color, isOverall, onClick }: ChipProps) {
  const base =
    'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';

  if (isOverall) {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          base,
          active
            ? 'border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/25'
            : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/60 dark:hover:bg-slate-700/70'
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        {label}
        <span
          className={cn(
            'rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums',
            active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
          )}
        >
          {count.toLocaleString()}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={
        active && color
          ? { borderColor: color, backgroundColor: `${color}26`, boxShadow: `0 0 0 1px ${color}` }
          : undefined
      }
      className={cn(
        base,
        active
          ? 'text-slate-900 dark:text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700/70'
      )}
    >
      {active ? (
        <Check className="h-3.5 w-3.5" style={{ color }} strokeWidth={3} />
      ) : (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
      <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-500 dark:bg-slate-700 dark:text-slate-300">
        {count.toLocaleString()}
      </span>
    </button>
  );
}

export function HourlyCategoryChart({
  title,
  scopeLabel,
  itemLabelPlural,
  badgeClass,
  data,
  categories,
  isDark,
  gradientId,
}: HourlyCategoryChartProps) {
  // Empty selection === "Overall". Individual chips can be combined to compare them.
  const [selected, setSelected] = useState<string[]>([]);

  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const tooltipColor = isDark ? '#f8fafc' : '#0f172a';

  // Ignore selections that don't exist in the current department scope.
  const active = useMemo(
    () => categories.filter((c) => selected.includes(c.name)),
    [categories, selected]
  );
  const isOverall = active.length === 0;
  const overallTotal = useMemo(() => categories.reduce((sum, c) => sum + c.total, 0), [categories]);

  const series = useMemo(
    () =>
      isOverall
        ? [{ key: OVERALL_KEY, name: 'Overall', fill: `url(#${gradientId})` }]
        : active.map((c) => ({ key: c.name, name: c.name, fill: c.color })),
    [isOverall, active, gradientId]
  );

  const stats = useMemo(() => {
    let total = 0;
    let peakCount = 0;
    let peakLabel = '-';
    for (const point of data) {
      let value = 0;
      if (isOverall) {
        value = Number(point[OVERALL_KEY]) || 0;
      } else {
        for (const c of active) value += Number(point[c.name]) || 0;
      }
      total += value;
      if (value > peakCount) {
        peakCount = value;
        peakLabel = point.hour;
      }
    }
    return { total, peakCount, peakLabel };
  }, [data, active, isOverall]);

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const singleSeries = series.length === 1;
  const maxBarSize = singleSeries ? 38 : series.length <= 3 ? 24 : series.length <= 6 ? 16 : 12;

  const modeLabel = isOverall
    ? `Overall — all ${itemLabelPlural} combined`
    : active.length === 1
    ? active[0].name
    : `Comparing ${active.length} ${itemLabelPlural}`;

  const badgeText = isOverall ? 'Overall Total' : `${active.length} Bar${active.length > 1 ? 's' : ''} per Hour`;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {scopeLabel} • {categories.length} {itemLabelPlural}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold', badgeClass)}>{badgeText}</span>
      </div>

      {/* Filter bar */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </span>
          {categories.length > 1 && (
            <button
              type="button"
              onClick={() => setSelected(categories.map((c) => c.name))}
              className="text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Compare all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            isOverall
            label="Overall"
            count={overallTotal}
            active={isOverall}
            onClick={() => setSelected([])}
          />
          {categories.map((c) => (
            <FilterChip
              key={c.name}
              label={c.name}
              count={c.total}
              color={c.color}
              active={active.some((a) => a.name === c.name)}
              onClick={() => toggle(c.name)}
            />
          ))}
        </div>
      </div>

      {/* Selection summary */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Showing: <span className="text-indigo-600 dark:text-indigo-400">{modeLabel}</span>
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {stats.total.toLocaleString()} calls • Peak:{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {stats.peakLabel}
            {stats.peakCount > 0 && ` (${stats.peakCount.toLocaleString()})`}
          </span>
        </span>
      </div>

      {/* Chart */}
      <div className="mt-2 h-80">
        {categories.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No calls with a valid execution time for this selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 22, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="55%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="hour" stroke={axisStroke} fontSize={11} tick={{ fill: axisStroke }} interval={0} />
              <YAxis stroke={axisStroke} fontSize={11} tick={{ fill: axisStroke }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(99,102,241,0.07)' }}
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: tooltipColor,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
                // The Overall bar uses a gradient, which can't be used as a text color.
                itemStyle={isOverall ? { color: tooltipColor } : undefined}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [Number(value).toLocaleString(), name]}
                labelFormatter={(label) => `Hour: ${label}`}
              />
              {!singleSeries && (
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="rect" iconSize={10} />
              )}
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.fill}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={maxBarSize}
                >
                  {singleSeries && (
                    <LabelList
                      dataKey={s.key}
                      position="top"
                      fill={axisStroke}
                      fontSize={10}
                      fontWeight={600}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => (Number(v) > 0 ? Number(v).toLocaleString() : '')}
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

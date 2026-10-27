import { FileSpreadsheet, Plus, X, GitCompareArrows, Loader2, CalendarDays, MemoryStick } from 'lucide-react';
import type { Dataset, ParseProgress } from '../types';
import { formatBytes } from '../utils/memory';
import { cn } from '../utils/cn';

interface DatasetTabsProps {
  datasets: Dataset[];
  activeId: string | null;
  isCompareMode: boolean;
  onSelect: (id: string) => void;
  onSelectCompare: () => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  isLoading: boolean;
  progress: ParseProgress | null;
  /** Estimated total heap of all loaded datasets */
  totalHeapBytes?: number;
  /** Maximum safe heap budget */
  heapBudgetBytes?: number;
  totalRows?: number;
}

export function DatasetTabs({
  datasets,
  activeId,
  isCompareMode,
  onSelect,
  onSelectCompare,
  onRemove,
  onAdd,
  isLoading,
  progress,
  totalHeapBytes = 0,
  heapBudgetBytes = 1,
  totalRows = 0,
}: DatasetTabsProps) {
  const canCompare = datasets.length >= 2;
  const heapRatio = Math.min(1, totalHeapBytes / heapBudgetBytes);
  const heapColor =
    heapRatio > 0.85 ? '#f43f5e' : heapRatio > 0.6 ? '#f59e0b' : '#10b981';

  return (
    <div className="border-b border-slate-200 bg-slate-50/80 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {/* Label row */}
        <div className="flex items-center justify-between pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Excel Files
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
              {datasets.length} loaded
            </span>
            <span className="hidden rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline-block">
              {totalRows.toLocaleString()} rows total
            </span>
            {isLoading && progress && (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 sm:inline-flex">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="max-w-[320px] truncate">{progress.message}</span> ({progress.percent}%)
              </span>
            )}
          </div>

          {/* Memory budget meter */}
          <div className="flex items-center gap-2" title="Estimated heap usage across all loaded files">
            <MemoryStick className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <div className="hidden flex-col items-end sm:flex">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, heapRatio * 100)}%`, backgroundColor: heapColor }}
                />
              </div>
              <span className="mt-0.5 text-[10px] font-semibold tabular-nums" style={{ color: heapColor }}>
                {formatBytes(totalHeapBytes)} / {formatBytes(heapBudgetBytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex items-center gap-2 overflow-x-auto py-3">
          {datasets.map((ds) => {
            const isActive = !isCompareMode && ds.id === activeId;
            return (
              <div
                key={ds.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(ds.id)}
                className={cn(
                  'group relative flex min-w-[220px] max-w-[280px] shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-200',
                  isActive
                    ? 'border-indigo-500 bg-white shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/30 dark:border-indigo-400 dark:bg-slate-900 dark:ring-indigo-400/30'
                    : 'border-slate-200 bg-white/70 hover:border-indigo-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                )}
              >
                {/* Color dot */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ds.color }}
                />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-[13px] font-bold leading-tight',
                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'
                    )}
                    title={ds.fileName}
                  >
                    {ds.fileName}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-flex w-fit rounded-full px-1.5 py-px text-[9px] font-black uppercase tracking-widest',
                      ds.period === 'hourly'
                        ? 'bg-fuchsia-500/15 text-fuchsia-700 ring-1 ring-fuchsia-300/50 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:ring-fuchsia-700/50'
                        : 'bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-300/50 dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-700/50'
                    )}
                    title={ds.period === 'hourly' ? 'Hourly report dump' : 'End of day FIS report'}
                  >
                    {ds.period === 'hourly' ? 'Hourly' : 'End of Day'}
                  </span>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {ds.uploadedLabel} • {ds.rowCount.toLocaleString()} rows
                    </span>
                  </p>
                  {ds.dateRangeLabel && (
                    <p className="truncate text-[10px] font-medium text-indigo-600/80 dark:text-indigo-400/80">
                      Data: {ds.dateRangeLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(ds.id);
                  }}
                  title={`Remove ${ds.fileName} (frees ${formatBytes(ds.heapBytes)})`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {isActive && (
                  <span className="absolute -bottom-[13px] left-1/2 h-0.5 w-3/4 -translate-x-1/2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                )}
              </div>
            );
          })}

          {/* Add / Dump files button */}
          <button
            type="button"
            onClick={onAdd}
            disabled={isLoading}
            title="Dump one or more Excel / CSV files"
            className="flex h-[68px] min-w-[130px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-transparent text-slate-500 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            <span className="text-xs font-bold">Dump Files</span>
            <span className="text-[10px]">.xlsx .xls .csv</span>
          </button>

          <div className="mx-1 h-12 w-px shrink-0 bg-slate-200 dark:bg-slate-800" />

          {/* Compare tab */}
          <button
            type="button"
            onClick={onSelectCompare}
            disabled={!canCompare}
            title={canCompare ? 'Compare two files side by side' : 'Load at least 2 files to compare'}
            className={cn(
              'flex h-[68px] min-w-[150px] shrink-0 items-center justify-center gap-2 rounded-xl border px-4 transition-all duration-200',
              isCompareMode
                ? 'border-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/40'
                : canCompare
                  ? 'border-purple-300 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 text-purple-700 hover:shadow-md dark:border-purple-800/60 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50 dark:text-purple-300'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
            )}
          >
            <GitCompareArrows className="h-5 w-5" />
            <span className="text-left">
              <span className="block text-[13px] font-extrabold leading-tight">Compare</span>
              <span className="block text-[10px] font-medium opacity-80">
                {canCompare ? 'A vs B side-by-side' : 'Need 2+ files'}
              </span>
            </span>
          </button>
        </div>

        {/* Loading progress bar */}
        {isLoading && progress && (
          <div className="pb-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${Math.max(4, progress.percent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

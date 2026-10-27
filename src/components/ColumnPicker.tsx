import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Columns3, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnPickerProps {
  columns: ColumnOption[];
  visible: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Optional curated subset used by the "Minimal" shortcut */
  minimalKeys?: string[];
}

/**
 * Dropdown that controls WHICH COLUMNS are displayed in the records table.
 * Always keeps at least one column visible so the table never renders empty.
 */
export function ColumnPicker({ columns, visible, onChange, minimalKeys }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const allVisible = visible.size === columns.length;
  const hiddenCount = columns.length - visible.size;

  const toggle = (key: string) => {
    const next = new Set(visible);
    if (next.has(key)) {
      if (next.size <= 1) return; // never hide the last remaining column
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set(columns.map((column) => column.key)));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Choose which columns to display"
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500',
          hiddenCount > 0
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'
        )}
      >
        <Columns3 className="h-4 w-4" />
        <span>Columns</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums',
            hiddenCount > 0
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          )}
        >
          {visible.size}/{columns.length}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Show columns
            </span>
            <button
              type="button"
              onClick={() => {
                if (!allVisible) {
                  selectAll();
                  return;
                }
                const curated = (minimalKeys ?? columns.slice(0, 6).map((c) => c.key)).filter((key) =>
                  columns.some((column) => column.key === key)
                );
                onChange(new Set(curated.length > 0 ? curated : [columns[0].key]));
              }}
              title={allVisible ? 'Show a compact set of key columns' : 'Show every column'}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
            >
              <RotateCcw className="h-3 w-3" />
              {allVisible ? 'Minimal' : 'Show all'}
            </button>
          </div>

          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {columns.map((column) => {
              const checked = visible.has(column.key);
              const isLastVisible = checked && visible.size === 1;
              return (
                <button
                  key={column.key}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={isLastVisible}
                  onClick={() => toggle(column.key)}
                  title={isLastVisible ? 'At least one column must stay visible' : column.label}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors',
                    checked
                      ? 'text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-800',
                    isLastVisible && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                        : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{column.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 px-2 pt-2 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {hiddenCount === 0
                ? 'All columns shown'
                : `Showing ${visible.size} of ${columns.length} columns`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

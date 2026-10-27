import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface MultiSelectFilterProps {
  /** Label shown on the closed dropdown button (e.g. "Companies") */
  label: string;
  /** All available options */
  options: string[];
  /** Currently selected values. Empty array = all/none selected (show all) */
  selected: string[];
  /** Called with the new selection array */
  onChange: (selected: string[]) => void;
  /** Optional accent color theme */
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
  className?: string;
  /** Max width of the closed button label before truncation */
  maxLabelWidth?: string;
}

const accentClasses: Record<NonNullable<MultiSelectFilterProps['accent']>, {
  active: string;
  check: string;
  badge: string;
  hover: string;
}> = {
  indigo: {
    active: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    check: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-600 text-white dark:bg-indigo-500',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
  },
  emerald: {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    check: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-600 text-white dark:bg-emerald-500',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
  },
  amber: {
    active: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    check: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-600 text-white dark:bg-amber-500',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-950/40',
  },
  rose: {
    active: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    check: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-600 text-white dark:bg-rose-500',
    hover: 'hover:bg-rose-50 dark:hover:bg-rose-950/40',
  },
  sky: {
    active: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    check: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-600 text-white dark:bg-sky-500',
    hover: 'hover:bg-sky-50 dark:hover:bg-sky-950/40',
  },
  violet: {
    active: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    check: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-600 text-white dark:bg-violet-500',
    hover: 'hover:bg-violet-50 dark:hover:bg-violet-950/40',
  },
};

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  accent = 'indigo',
  className,
  maxLabelWidth = 'max-w-[180px]',
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = accentClasses[accent];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAll = selected.length === 0 || selected.length === options.length;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => onChange([]);

  // Label text
  let labelText = `All ${label}`;
  if (selected.length === 1) {
    labelText = selected[0];
  } else if (selected.length > 1 && selected.length < options.length) {
    labelText = `${selected.length} ${label}`;
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          !isAll
            ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'
        )}
      >
        <span className={cn('truncate font-semibold', maxLabelWidth)}>{labelText}</span>
        {!isAll && (
          <span className={cn('rounded-full px-1.5 py-0.2 text-[11px] font-bold', colors.badge)}>
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-500 transition-transform duration-200 dark:text-slate-400',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {!isAll && (
        <button
          type="button"
          onClick={selectAll}
          title={`Show all ${label.toLowerCase()}`}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Filter {label}</span>
            <button
              type="button"
              onClick={selectAll}
              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Select All
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            <button
              type="button"
              onClick={selectAll}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left',
                isAll
                  ? `${colors.active} font-semibold`
                  : `text-slate-700 ${colors.hover} dark:text-slate-300`
              )}
            >
              <span>All {label} ({options.length})</span>
              {isAll && <Check className={cn('h-4 w-4 shrink-0', colors.check)} />}
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            {options.map((option) => {
              const isChecked = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left',
                    isChecked
                      ? `${colors.active} font-semibold`
                      : `text-slate-700 ${colors.hover} dark:text-slate-300`
                  )}
                >
                  <span className="truncate pr-2">{option}</span>
                  {isChecked && <Check className={cn('h-4 w-4 shrink-0', colors.check)} />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-slate-100 pt-2 flex items-center justify-between px-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              {isAll
                ? `Showing all ${label.toLowerCase()}`
                : `${selected.length} of ${options.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

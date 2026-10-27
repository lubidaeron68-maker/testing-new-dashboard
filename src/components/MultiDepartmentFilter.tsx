import { useState, useRef, useEffect } from 'react';
import { Filter, Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface MultiDepartmentFilterProps {
  departments: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function MultiDepartmentFilter({
  departments,
  selected,
  onChange,
  className,
}: MultiDepartmentFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const isAll = selected.length === 0 || selected.length === departments.length;

  const toggleDept = (dept: string) => {
    if (selected.includes(dept)) {
      const next = selected.filter((d) => d !== dept);
      onChange(next);
    } else {
      onChange([...selected, dept]);
    }
  };

  const selectAll = () => {
    onChange([]);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Label text
  let labelText = 'All Departments';
  if (selected.length === 1) {
    labelText = selected[0];
  } else if (selected.length > 1 && selected.length < departments.length) {
    labelText = `${selected.length} Departments`;
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <div className="flex items-center gap-1.5">
        <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            !isAll
              ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'
          )}
        >
          <span className="truncate max-w-[180px] font-semibold">{labelText}</span>
          {!isAll && (
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[11px] font-bold text-white dark:bg-indigo-500">
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
            onClick={clearAll}
            title="Reset to All Departments"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Filter Departments</span>
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
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <span>All Departments ({departments.length})</span>
              {isAll && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            {departments.map((dept) => {
              const isChecked = selected.includes(dept);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDept(dept)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left',
                    isChecked
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <span className="truncate pr-2">{dept}</span>
                  {isChecked && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-slate-100 pt-2 flex items-center justify-between px-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              {isAll
                ? 'Showing all departments'
                : `${selected.length} of ${departments.length} selected`}
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

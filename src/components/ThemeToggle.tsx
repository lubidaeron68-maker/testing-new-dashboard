import { Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ isDark, onToggle, className, showLabel = true }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={cn(
        'group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200',
        isDark
          ? 'border-indigo-500/40 bg-slate-800/90 text-indigo-300 shadow-sm hover:border-indigo-400 hover:bg-slate-700/80 hover:text-white'
          : 'border-slate-300 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-slate-50 hover:text-slate-900',
        className
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative flex h-4 w-4 items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-600 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>
      {showLabel && (
        <span className="hidden sm:inline">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}

import { useId, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, FileDown, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import type { DailyCallListFile, ParseProgress } from '../types';
import { formatBytes } from '../utils/memory';
import { cn } from '../utils/cn';
import { DAILY_CALL_LIST_HEADERS } from '../utils/dailyCallListSchema';
import { downloadDailyCallListTemplate } from '../utils/dailyCallListTemplate';
import { OneDriveFolderCard } from './OneDriveFolderCard';
import type { DailyFolderController } from '../hooks/useDailyCallListFolder';

interface DailyCallListUploadProps {
  file: DailyCallListFile | null;
  isLoading: boolean;
  disabled?: boolean;
  progress: ParseProgress | null;
  error: string | null;
  onUpload: (file: File) => void;
  onError: (message: string) => void;
  onCancel: () => void;
  folder: DailyFolderController;
  onRemove: () => void;
}

export function DailyCallListUpload({
  file, isLoading, disabled = false, progress, error, onUpload, onError, onCancel, folder, onRemove,
}: DailyCallListUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const isBusy = disabled || isLoading;

  const acceptFiles = (files: File[]) => {
    if (isBusy || files.length === 0) return;
    if (files.length !== 1) {
      onError('Please upload one Daily Call List file at a time.');
      return;
    }
    onUpload(files[0]);
  };

  return (
    <section aria-labelledby={headingId} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600">
          <CalendarDays className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 id={headingId} className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Daily Call List</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload your 17-column portfolio file here. This uses a different format from collections reports.
          </p>
        </div>
      </div>

      <OneDriveFolderCard folder={folder} />

      {file && (
        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={file.fileName}>{file.fileName}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {file.records.length.toLocaleString()} rows / {formatBytes(file.sourceBytes)} / Uploaded {file.uploadedLabel}
            </p>
          </div>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Daily Call List loaded" />
          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            aria-label="Remove Daily Call List file"
            title="Remove Daily Call List file"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-cyan-500 disabled:opacity-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        data-testid="daily-call-list-dropzone"
        aria-busy={isLoading}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!isBusy) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
          acceptFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          'mt-4 rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors duration-200',
          isDragging
            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40'
            : 'border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/30',
          disabled && 'opacity-60'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label="Upload Daily Call List file"
          disabled={isBusy}
          className="hidden"
          onChange={(event) => {
            acceptFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = '';
          }}
        />
        {isLoading ? (
          <div className="mx-auto max-w-md" role="status" aria-live="polite">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-500 motion-reduce:animate-none" />
            <p className="mt-3 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{progress?.message || 'Reading Daily Call List...'}</p>
            <div
              role="progressbar"
              aria-label="Daily Call List upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress?.percent ?? 0}
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-[width] duration-200" style={{ width: `${progress?.percent ?? 0}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Processing runs in the background. You can keep using the page.</p>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-cyan-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel import
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-7 w-7 text-cyan-600 dark:text-cyan-400" />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {file ? 'Drop a new Daily Call List to replace this file' : 'Drop your Daily Call List file here'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Excel (.xlsx, .xls) or CSV / up to 300 MB</p>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              {file ? 'Replace daily file' : 'Browse daily file'}
            </button>
          </>
        )}
      </div>
      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Uses portfolio_date and agreement_id, not the collections Date or Action result columns. IDs and mobile numbers are kept as text. Large files require available browser memory.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">Keep all 17 headers in the first worksheet. Blank values are allowed.</p>
        <button
          type="button"
          onClick={downloadDailyCallListTemplate}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-950"
        >
          <FileDown className="h-4 w-4" /> Download daily template
        </button>
      </div>
      <details className="mt-4 text-slate-600 dark:text-slate-300">
        <summary className="cursor-pointer text-xs font-semibold focus-visible:outline-cyan-500">Expected Daily Call List columns ({DAILY_CALL_LIST_HEADERS.length})</summary>
        <ol className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {DAILY_CALL_LIST_HEADERS.map((header, index) => (
            <li key={header} className="flex items-baseline gap-2">
              <span className="text-[10px] tabular-nums text-cyan-600 dark:text-cyan-400">{String(index + 1).padStart(2, '0')}</span>
              <code className="break-all text-[11px]">{header}</code>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
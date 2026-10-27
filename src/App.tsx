import { useState, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Table2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Files,
  Trash2,
  CalendarDays,
  ShieldCheck,
  LogOut,
  Crown,
} from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { KPICards } from './components/KPICards';
import { SummaryStrip } from './components/SummaryStrip';
import {
  AgentPerformanceChart,
  ContactTypeChart,
  CompanyBreakdownChart,
  DepartmentChart,
  ClientPTPChart,
  CallDurationChart,
  AgentPTPAmountChart,
} from './components/Charts';
import { HourlyComparisonCharts } from './components/HourlyComparisonCharts';
import { AgentPtpOutstandingChart } from './components/AgentPtpOutstandingChart';
import { DataTable } from './components/DataTable';
import { DailyCallListTable } from './components/DailyCallListTable';
import { DailyCallListSummary } from './components/DailyCallListSummary';
import { DailyCallListUpload } from './components/DailyCallListUpload';
import { ThemeToggle } from './components/ThemeToggle';
import { BrandLogo } from './components/BrandLogo';
import { DatasetTabs } from './components/DatasetTabs';
import { CompareView } from './components/CompareView';
import { useTheme } from './hooks/useTheme';
import { useDailyCallListFolder } from './hooks/useDailyCallListFolder';
import { useAuth } from './hooks/useAuth';
import { SecurityPage } from './components/SecurityPage';
import { AccessManager } from './components/AccessManager';
import { parseExcelFile } from './utils/excelParser';
import { processData } from './utils/dataProcessor';
import { generateSampleData, generateHourlySampleData } from './utils/sampleData';
import { importDailyCallList, validateDailyCallListFile } from './utils/dailyCallListImport';
import {
  estimateRecordHeap,
  stringPool,
  TOTAL_HEAP_BUDGET_BYTES,
  MAX_SINGLE_FILE_BYTES,
  MAX_TABLE_ROWS,
  formatBytes,
} from './utils/memory';
import type { DashboardData, CollectionRecord, ParseProgress, Dataset, DailyCallListFile, ReportPeriod } from './types';
import { cn } from './utils/cn';

const DATASET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6'];

function makeId(): string {
  return `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatUploadedLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getDateRangeLabel(records: CollectionRecord[]): string {
  const dates = records.map((r) => r.date).filter(Boolean).sort();
  if (dates.length === 0) return '';
  const min = dates[0];
  const max = dates[dates.length - 1];
  const fmtDay = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  if (min === max) {
    const d = new Date(min);
    if (isNaN(d.getTime())) return min;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const maxDate = new Date(max);
  const year = isNaN(maxDate.getTime()) ? '' : `, ${maxDate.getFullYear()}`;
  return `${fmtDay(min)} → ${fmtDay(max)}${year}`;
}

/** Drop all heap references of a dataset so the browser can reclaim them. */
function freeDataset(ds: Dataset): void {
  try {
    ds.data.records.length = 0;
    ds.data.agentPerformance.length = 0;
    ds.data.companyBreakdown.length = 0;
    ds.data.contactTypeStats.length = 0;
    ds.data.departmentStats.length = 0;
    ds.data.ptpStatusStats.length = 0;
    ds.data.callDurationBuckets.length = 0;
    ds.data.companies.length = 0;
    ds.data.departments.length = 0;
    ds.data.agents.length = 0;
  } catch {
    /* best-effort */
  }
  stringPool.release();
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const auth = useAuth();
  const { currentUser, isAdmin } = auth;
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dailyFile, setDailyFile] = useState<DailyCallListFile | null>(null);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [dailyProgress, setDailyProgress] = useState<ParseProgress | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [dailyView, setDailyView] = useState<'records' | 'summary'>('records');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'daily' | 'records'>('overview');
  const [analyticsDepts, setAnalyticsDepts] = useState<string[]>([]);
  const dailyFolder = useDailyCallListFolder();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hourlyInputRef = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const dailyAbortRef = useRef<AbortController | null>(null);
  const isBusy = isLoading || isDailyLoading;

  const totalHeap = useMemo(
    () => datasets.reduce((sum, d) => sum + d.heapBytes, 0) + (dailyFile?.heapBytes ?? 0),
    [datasets, dailyFile]
  );
  const totalRows = useMemo(() => datasets.reduce((sum, d) => sum + d.rowCount, 0), [datasets]);

  const activeDataset: Dataset | null = useMemo(() => {
    if (datasets.length === 0) return null;
    return datasets.find((d) => d.id === activeDatasetId) ?? datasets[0];
  }, [datasets, activeDatasetId]);

  const memoizedData: DashboardData | null = activeDataset?.data ?? null;
  const fileName = activeDataset?.fileName ?? null;
  const loadStats = activeDataset ? { rowCount: activeDataset.rowCount, durationMs: activeDataset.durationMs } : null;
  const isUploadView = datasets.length === 0 && !dailyFile;

  // Re-compute complete analytics dataset when department filter is applied
  const filteredAnalyticsData: DashboardData | null = useMemo(() => {
    if (!memoizedData) return null;
    if (analyticsDepts.length === 0 || analyticsDepts.length === memoizedData.departments.length) {
      return memoizedData;
    }
    const deptSet = new Set(analyticsDepts);
    const filteredRecords = memoizedData.records.filter((r) => deptSet.has(r.department));
    return processData(filteredRecords);
  }, [memoizedData, analyticsDepts]);

  const buildDataset = useCallback(
    (
      records: CollectionRecord[],
      name: string,
      sourceBytes: number,
      durationMs: number,
      colorIndex: number,
      period: ReportPeriod = 'eod'
    ): Dataset => {
      // Overall aggregates are computed before bounding the collections grid.
      const processed = processData(records);

      // 2. Bound the interactive grid: keep only the most recent MAX_TABLE_ROWS
      //    rows for the paginated Records table. Dropping these references lets
      //    the GC reclaim the rest right after this function returns, which is
      //    what keeps a 300 MB workbook from exhausting the tab.
      let tableRows = records;
      let truncatedRows = 0;
      if (records.length > MAX_TABLE_ROWS) {
        truncatedRows = records.length - MAX_TABLE_ROWS;
        const byDate = [...records].sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date); // newest first
        });
        tableRows = byDate.slice(0, MAX_TABLE_ROWS);
        processed.records = tableRows;
      }

      const now = new Date();
      stringPool.retain();
      return {
        id: makeId(),
        fileName: name,
        period,
        uploadedAt: now.toISOString(),
        uploadedLabel: formatUploadedLabel(now),
        data: processed,
        rowCount: records.length,
        durationMs,
        color: DATASET_COLORS[colorIndex % DATASET_COLORS.length],
        dateRangeLabel: getDateRangeLabel(records),
        heapBytes: estimateRecordHeap(tableRows.length),
        sourceBytes,
        tableRowCount: tableRows.length,
        truncatedRows,
      };
    },
    []
  );

  const handleFilesUpload = useCallback(
    async (files: File[], period: ReportPeriod = 'eod') => {
      if (uploadLock.current || files.length === 0) return;
      // Hourly dumps are an Admin-only capability.
      if (period === 'hourly' && !isAdmin) {
        setError('Admin access is required to upload hourly report files.');
        setTimeout(() => setError(null), 6000);
        return;
      }
      // Single-active-file mode: each new upload replaces the previous report.
      const replaced = [...datasets];
      replaced.forEach(freeDataset);
      uploadLock.current = true;
      setIsLoading(true);
      setError(null);
      setNotice(null);

      let addedId: string | null = null;
      const failures: string[] = [];
      const succeeded: string[] = [];
      // Holds the newest parsed dataset so the single-active-file commit below
      // always has it available, regardless of what `datasets` contained before.
      let keptDataset: Dataset | null = null;

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const tag = files.length > 1 ? `[${i + 1}/${files.length}] ${file.name}` : file.name;

          if (file.size > MAX_SINGLE_FILE_BYTES) {
            failures.push(`${file.name}: exceeds the 320 MB single-file cap (${formatBytes(file.size)})`);
            continue;
          }

          setProgress({ stage: 'reading', percent: 5, message: `Starting ${tag}...` });
          const startTime = performance.now();
          try {
            const records = await parseExcelFile(file, (p) => {
              setProgress({
                ...p,
                message: files.length > 1 ? `${tag}: ${p.message}` : p.message,
              });
            });
            if (records.length === 0) {
              failures.push(`${file.name}: no records found`);
              continue;
            }
            const durationMs = Math.round(performance.now() - startTime);
            const ds = buildDataset(records, file.name, file.size, durationMs, 0, period);
            addedId = ds.id;
            // Later successful files overwrite earlier ones; the last one wins.
            if (keptDataset) freeDataset(keptDataset);
            keptDataset = ds;
            succeeded.push(`${file.name} (${records.length.toLocaleString()} rows)`);
          } catch (err) {
            console.error(err);
            failures.push(`${file.name}: ${err instanceof Error ? err.message : 'failed to parse'}`);
          }
        }

        if (addedId && keptDataset) {
          // Single-active-file mode: only the most recent upload is kept.
          setDatasets([keptDataset]);
          setActiveDatasetId(addedId);
          setIsCompareMode(false);
          setActiveTab('overview');
          if (failures.length === 0) {
            setNotice(`Replaced the previous report with the latest upload.`);
            setTimeout(() => setNotice(null), 6000);
          }
        } else {
          // Nothing imported: restore the previous state instead of leaving it blank.
          setDatasets(replaced);
        }

        if (failures.length > 0) {
          setError(`Failed to load file(s). ${failures.join(' | ')}`);
          setTimeout(() => setError(null), 10000);
        }
      } finally {
        uploadLock.current = false;
        setIsLoading(false);
        setProgress(null);
      }
    },
    [datasets, dailyFile, buildDataset, isAdmin]
  );

  const handleDailyUpload = useCallback(async (file: File) => {
    if (uploadLock.current) return;
    if (!isAdmin) {
      setDailyError('Admin access only. Sign in with an Admin account to upload the Daily Call List.');
      return;
    }
    try {
      validateDailyCallListFile(file);
    } catch (error) {
      setDailyError(error instanceof Error ? error.message : 'Choose a valid Daily Call List file.');
      return;
    }
    // Archive every dumped daily file independently of parsing. A parse failure
    // must not lose the uploaded source file, and a folder failure must not
    // prevent the list from opening in the dashboard.
    void dailyFolder.archive(file);
    uploadLock.current = true;
    setIsDailyLoading(true);
    setDailyError(null);
    setDailyProgress({ stage: 'reading', percent: 0, message: `Opening ${file.name}...` });
    const controller = new AbortController();
    dailyAbortRef.current = controller;
    try {
      // A replacement can reuse the memory held by the old daily file.
      const availableHeap = TOTAL_HEAP_BUDGET_BYTES - totalHeap + (dailyFile?.heapBytes ?? 0);
      const imported = await importDailyCallList(file, availableHeap, setDailyProgress, controller.signal);
      // Commit only on success; a failed replacement keeps the previous daily list.
      setDailyFile(imported);
      setDailyView('records');
      setIsCompareMode(false);
      setActiveTab('daily');
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setDailyError(err instanceof Error ? err.message : 'Could not read the Daily Call List. Please try another Excel or CSV file.');
      }
    } finally {
      dailyAbortRef.current = null;
      uploadLock.current = false;
      setIsDailyLoading(false);
      setDailyProgress(null);
    }
  }, [dailyFile, totalHeap, dailyFolder.archive, isAdmin]);

  const handleCancelDailyUpload = useCallback(() => {
    dailyAbortRef.current?.abort();
  }, []);

  const handleRemoveDailyFile = useCallback(() => {
    if (uploadLock.current) return;
    if (!isAdmin) return;
    setDailyFile(null);
    setDailyError(null);
    setDailyView('records');
  }, [isAdmin]);

  const handleHourlyClick = useCallback(() => {
    if (!isAdmin) return;
    hourlyInputRef.current?.click();
  }, [isAdmin]);

  const handleHourlyFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) void handleFilesUpload(files, 'hourly');
      e.target.value = '';
    },
    [handleFilesUpload]
  );

  const handleLoadSample = useCallback(
    (period: ReportPeriod = 'eod') => {
    if (uploadLock.current) return;
    if (period === 'hourly' && !isAdmin) {
      setError('Admin access is required to load hourly report samples.');
      setTimeout(() => setError(null), 6000);
      return;
    }
    datasets.forEach(freeDataset);
    const n = datasets.length + 1;
    const sampleRecords = period === 'hourly' ? generateHourlySampleData(10, 250) : generateSampleData(250);
    const ds = buildDataset(sampleRecords, `Sample ${period.toUpperCase()} Data ${n} (Demo)`, 60_000, 45, 0, period);
    setDatasets([ds]);
    setActiveDatasetId(ds.id);
    setIsCompareMode(false);
    setActiveTab('overview');
    setError(null);
    },
    [datasets, buildDataset, isAdmin]
  );

  const handleRemoveDataset = useCallback(
    (id: string) => {
      if (uploadLock.current) return;
      const removed = datasets.find((d) => d.id === id);
      if (!removed) return;
      freeDataset(removed);
      setDatasets([]);
      setIsCompareMode(false);
      if (dailyFile) setActiveTab('daily');
    },
    [datasets, dailyFile]
  );

  const handleClear = useCallback(() => {
    if (uploadLock.current) return;
    datasets.forEach(freeDataset);
    setDatasets([]);
    setDailyFile(null);
    setDailyError(null);
    setDailyView('records');
    setActiveDatasetId(null);
    setAnalyticsDepts([]);
    setIsCompareMode(false);
    setError(null);
    setProgress(null);
    setActiveTab('overview');
  }, [datasets]);

  const handleLogout = useCallback(() => {
    if (uploadLock.current) return;
    datasets.forEach(freeDataset);
    setDatasets([]);
    setDailyFile(null);
    setDailyError(null);
    setDailyView('records');
    setActiveDatasetId(null);
    setAnalyticsDepts([]);
    setIsCompareMode(false);
    setError(null);
    setNotice(null);
    setProgress(null);
    setDailyProgress(null);
    setActiveTab('overview');
    setShowAccessManager(false);
    auth.logout();
  }, [datasets, auth]);

  const handleError = useCallback((err: string) => {
    setError(err);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDashboardFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) void handleFilesUpload(files);
      e.target.value = '';
    },
    [handleFilesUpload]
  );

  const handleSelectDataset = useCallback((id: string) => {
    setActiveDatasetId(id);
    setAnalyticsDepts([]);
    setIsCompareMode(false);
    setActiveTab((tab) => tab === 'daily' ? 'overview' : tab);
  }, []);

  const handleSelectCompare = useCallback(() => {
    if (datasets.length >= 2) setIsCompareMode(true);
  }, [datasets.length]);

  // Viewer accounts never see the Daily Call List upload zone at all.
  const dailyUploadPanel = isAdmin ? (
    <DailyCallListUpload
      file={dailyFile}
      isLoading={isDailyLoading}
      disabled={isLoading}
      progress={dailyProgress}
      error={dailyError}
      onUpload={handleDailyUpload}
      onError={setDailyError}
      onCancel={handleCancelDailyUpload}
      folder={dailyFolder}
      onRemove={handleRemoveDailyFile}
    />
  ) : null;

  // ============================ SECURITY GATE ============================
  if (!currentUser) {
    return (
      <SecurityPage
        needsSetup={auth.users.length === 0}
        onLogin={auth.login}
        onSetupAdmin={auth.setupAdmin}
      />
    );
  }

  // ============================ UPLOAD VIEW ============================
  if (isUploadView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 transition-colors duration-200 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo />
                <div>
                  <h1 className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-xl font-black tracking-wide text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
                    Fis Report
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Upload your Excel files to get started</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 sm:inline-flex dark:border-white/15 dark:bg-white/5">
                  {isAdmin ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />}
                  {currentUser.displayName}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
                      isAdmin ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-black' : 'bg-white/15 text-slate-200'
                    )}
                  >
                    {currentUser.role}
                  </span>
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAccessManager(true)}
                    className="hidden items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-cyan-400/20 sm:inline-flex dark:text-cyan-200"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Access
                  </button>
                )}
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800">
              <Sparkles className="h-4 w-4" />
              Multi-File 12-Hour Analytics + Compare
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Dump Your FIS Report Files
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Use <span className="font-bold text-indigo-600 dark:text-indigo-400">End of Day</span> for your closing
              FIS report, and the{' '}
              <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">Hourly</span> panel for intra-day
              report dumps. Each file gets its own dated tab.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {notice && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{notice}</p>
            </div>
          )}

          {/* End of Day FIS report upload */}
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-md shadow-indigo-500/25">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-wide text-slate-900 dark:text-white">
                  End of Day — FIS Report
                </h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Upload the closing FIS report for the day. Supports one or many files at once.
                </p>
              </div>
            </div>
            <FileUpload
              variant="eod"
              inputId="eod-file-input"
              onFileLoad={(file) => void handleFilesUpload([file], 'eod')}
              onFilesLoad={(files) => void handleFilesUpload(files, 'eod')}
              onError={handleError}
              isLoading={isLoading}
              disabled={isDailyLoading}
              progress={progress}
              fileName={null}
              onClear={handleClear}
              onLoadSample={() => handleLoadSample('eod')}
            />
          </div>

          {/* Hourly reports upload (visible to Admins only; hidden for viewers) */}
          {isAdmin && (
            <div className="mt-8">
              <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 shadow-md shadow-fuchsia-500/25">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-wide text-slate-900 dark:text-white">
                        Hourly Reports
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        Dump the report data every hour for intra-day tracking. Same columns, hourly cadence.
                      </p>
                    </div>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-black sm:inline-flex">
                    <Crown className="h-3 w-3" />
                    Admin
                  </span>
                </div>
                <FileUpload
                  variant="hourly"
                  inputId="hourly-file-input"
                  onFileLoad={(file) => void handleFilesUpload([file], 'hourly')}
                  onFilesLoad={(files) => void handleFilesUpload(files, 'hourly')}
                  onError={handleError}
                  isLoading={isLoading}
                  disabled={isDailyLoading}
                  progress={progress}
                  fileName={null}
                  onClear={handleClear}
                  onLoadSample={() => handleLoadSample('hourly')}
                  showSampleActions={false}
                />
              </div>
            </div>
          )}

          {/* Daily Call List upload (visible to Admins only; hidden for viewers) */}
          {isAdmin && <div className="mt-8">{dailyUploadPanel}</div>}

          {/* Expected columns panel */}
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Collections Report Columns (28 Fields)
              </h3>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Auto-Converts "21-10-2026 22:01:10" to 12-Hour Format
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {[
                'Company name', 'Agreement id', 'Credit assignment date', 'Department',
                'Initial DPD', 'Actual DPD', 'Agent login', 'Agent name',
                'Action type', 'Contact type', 'Action result', 'Overdue reason',
                'Date', 'Execution dtime (12-Hr)', 'Dialed phone', 'Requested payment channel',
                'PTP status', 'PTP due date', 'PTP amount', 'PTP paid amount',
                'Payment plan summary', 'Payment plan status', 'Payment plan target amount', 'Payment plan paid amount',
                'Payment plan not paid amount', 'Agents note', 'Call duration, minutes', 'Additional action',
              ].map((col) => (
                <div
                  key={col}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 transition-colors dark:bg-slate-800/60"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                  <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{col}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Files, title: 'Multi-File Tabs', desc: 'Dump many files — each gets a dated tab + color' },
              { icon: BarChart3, title: 'A-vs-B Compare', desc: 'KPI deltas, charts & agent face-off per file' },
              { icon: Upload, title: 'Large File Imports', desc: 'Size validation, progress, and a memory budget' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60">
                  <feature.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{feature.title}</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </main>
        {showAccessManager && isAdmin && <AccessManager auth={auth} onClose={() => setShowAccessManager(false)} />}
      </div>
    );
  }

  // ============================ DASHBOARD VIEW ============================
  return (
    <div className="min-h-screen bg-slate-100 transition-colors duration-200 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-lg font-black tracking-wide text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
                    Fis Report
                  </h1>
                  {loadStats && !isCompareMode && activeTab !== 'daily' && (
                    <span className="hidden items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 sm:inline-flex">
                      <Sparkles className="h-3 w-3" />
                      {loadStats.rowCount.toLocaleString()} rows in {(loadStats.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {isCompareMode && (
                    <span className="hidden items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-pink-600 px-2 py-0.5 text-[11px] font-bold text-white sm:inline-flex">
                      Compare mode
                    </span>
                  )}
                </div>
                <p className="max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400 sm:max-w-none">
                  {isCompareMode
                    ? `${datasets.length} files loaded — comparing two`
                    : activeTab === 'daily'
                      ? dailyFile ? `Daily Call List: ${dailyFile.fileName}` : 'Upload a separate Daily Call List file'
                      : `${fileName} • ${formatBytes(totalHeap)} across ${datasets.length} file${datasets.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 md:inline-flex dark:border-white/15 dark:bg-white/5">
                {isAdmin ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />}
                <span className="max-w-[140px] truncate">{currentUser?.displayName}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
                    isAdmin ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-black' : 'bg-white/15 text-slate-200'
                  )}
                >
                  {currentUser?.role}
                </span>
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAccessManager(true)}
                  title="Manage user access"
                  className="hidden items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-400/20 md:inline-flex dark:text-cyan-200"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden xl:inline">Access</span>
                </button>
              )}
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden xl:inline">Sign out</span>
              </button>

              <button
                onClick={handleClear}
                disabled={isBusy}
                title="Remove all loaded files"
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden xl:inline">Clear All</span>
              </button>

              <button
                onClick={handleAddClick}
                disabled={isBusy}
                title="Dump end-of-day FIS report files"
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">End of Day</span>
              </button>

              {isAdmin && (
                <button
                  onClick={handleHourlyClick}
                  disabled={isBusy}
                  title="Dump hourly report files (Admin)"
                  className="flex items-center gap-1.5 rounded-lg border border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-sm font-semibold text-fuchsia-700 transition-colors hover:bg-fuchsia-100 disabled:opacity-50 dark:border-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Hourly</span>
                </button>
              )}

              <button
                onClick={() => handleLoadSample('eod')}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Add Sample</span>
              </button>
            </div>
          </div>
        </div>
        {/* Hidden inputs for dumping more files from the dashboard */}
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Upload end of day FIS report files"
          accept=".xlsx,.xls,.csv"
          disabled={isBusy}
          multiple
          className="hidden"
          onChange={handleDashboardFilesChange}
        />
        {isAdmin && (
          <input
            ref={hourlyInputRef}
            type="file"
            aria-label="Upload hourly report files"
            accept=".xlsx,.xls,.csv"
            disabled={isBusy}
            multiple
            className="hidden"
            onChange={handleHourlyFilesChange}
          />
        )}
      </header>

      {/* File tab bar: one uniquely-dated tab per dumped Excel file + Compare tab */}
      <DatasetTabs
        datasets={datasets}
        activeId={activeTab === 'daily' && !isCompareMode ? null : activeDataset?.id ?? null}
        isCompareMode={isCompareMode}
        onSelect={handleSelectDataset}
        onSelectCompare={handleSelectCompare}
        onRemove={handleRemoveDataset}
        onAdd={handleAddClick}
        isLoading={isBusy}
        progress={isDailyLoading ? dailyProgress : progress}
        totalHeapBytes={totalHeap}
        heapBudgetBytes={TOTAL_HEAP_BUDGET_BYTES}
        totalRows={totalRows + (dailyFile?.records.length ?? 0)}
      />

      {/* View tabs (hidden in compare mode) */}
      {!isCompareMode && (
        <div className="border-b border-slate-200 bg-white transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto" aria-label="Report views">
              {[
                { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
                { id: 'analytics' as const, label: 'Analytics (12-Hour Hourly)', icon: BarChart3 },
                { id: 'daily' as const, label: 'Daily Call List', icon: CalendarDays, adminOnly: true },
                { id: 'records' as const, label: 'Records', icon: Table2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={tab.id !== 'daily' && !activeDataset}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  title={'adminOnly' in tab && tab.adminOnly && !isAdmin ? 'Admin access only' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {'adminOnly' in tab && tab.adminOnly && !isAdmin && (
                    <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                      Admin
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {notice && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{notice}</p>
          </div>
        )}

        {isCompareMode ? (
          <CompareView key={`compare-${datasets.map((d) => d.id).join('-')}`} datasets={datasets} isDark={isDark} />
        ) : (
          <>
            {activeTab === 'overview' && memoizedData && activeDataset && (
              <div className="space-y-6">
                <SummaryStrip data={memoizedData} fileName={fileName || undefined} />
                <KPICards kpi={memoizedData.kpi} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <CompanyBreakdownChart data={memoizedData.companyBreakdown} isDark={isDark} />
                  <ContactTypeChart data={memoizedData.contactTypeStats} isDark={isDark} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ClientPTPChart data={memoizedData.clientPtpStats} isDark={isDark} />
                  <CallDurationChart data={memoizedData.callDurationBuckets} isDark={isDark} />
                </div>
              </div>
            )}

            {activeTab === 'daily' && (
              <div className="space-y-6">
                {!isAdmin ? null : (
                  <>
                    {dailyUploadPanel}
                    {dailyFile && (
                  <>
                    <div role="group" aria-label="Daily Call List display" className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
                      {([
                        { id: 'records', label: 'Uploaded rows' },
                        { id: 'summary', label: 'Portfolio summary' },
                      ] as const).map((view) => (
                        <button
                          key={view.id}
                          type="button"
                          aria-pressed={dailyView === view.id}
                          onClick={() => setDailyView(view.id)}
                          className={cn(
                            'border-b-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500',
                            dailyView === view.id
                              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-300'
                              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                          )}
                        >
                          {view.label}
                        </button>
                      ))}
                    </div>
                    {dailyView === 'records' ? (
                      <DailyCallListTable key={dailyFile.id} file={dailyFile} />
                    ) : (
                      <DailyCallListSummary key={dailyFile.id} days={dailyFile.portfolioSummary} />
                    )}
                  </>
                )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'analytics' && memoizedData && filteredAnalyticsData && activeDataset && (
              <div className="space-y-6">
                <HourlyComparisonCharts
                  key={activeDataset.id}
                  records={memoizedData.records}
                  departments={memoizedData.departments}
                  isDark={isDark}
                  defaultKpi={memoizedData.kpi}
                  selectedDepts={analyticsDepts}
                  onSelectedDeptsChange={setAnalyticsDepts}
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <AgentPerformanceChart data={filteredAnalyticsData.agentPerformance} isDark={isDark} />
                  <AgentPTPAmountChart data={filteredAnalyticsData.agentPerformance} isDark={isDark} />
                </div>
                {/* PTP amount per agent vs outstanding balance of the accounts they PTP'd */}
                <AgentPtpOutstandingChart
                  records={filteredAnalyticsData.records}
                  callist={dailyFile?.records ?? []}
                  isDark={isDark}
                  callistFileName={dailyFile?.fileName}
                />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <DepartmentChart data={filteredAnalyticsData.departmentStats} isDark={isDark} />
                  <ContactTypeChart data={filteredAnalyticsData.contactTypeStats} isDark={isDark} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <CompanyBreakdownChart data={filteredAnalyticsData.companyBreakdown} isDark={isDark} />
                  <ClientPTPChart data={filteredAnalyticsData.clientPtpStats} isDark={isDark} />
                </div>
                <CallDurationChart data={filteredAnalyticsData.callDurationBuckets} isDark={isDark} />
              </div>
            )}

            {activeTab === 'records' && memoizedData && activeDataset && (
              <DataTable
                key={activeDataset.id}
                records={memoizedData.records}
                companies={memoizedData.companies}
                departments={memoizedData.departments}
                agents={memoizedData.agents}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1600px] px-4 text-center text-sm text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          Fis Report • {datasets.length} collections file{datasets.length === 1 ? '' : 's'} •{' '}
          {totalRows.toLocaleString()} collection records
          {dailyFile && ` / Daily Call List: ${dailyFile.records.length.toLocaleString()} rows`}
          {' '}• Estimated heap {formatBytes(totalHeap)} /{' '}
          {formatBytes(TOTAL_HEAP_BUDGET_BYTES)} • 12-Hour Format Active
        </div>
      </footer>
      {showAccessManager && isAdmin && <AccessManager auth={auth} onClose={() => setShowAccessManager(false)} />}
    </div>
  );
}

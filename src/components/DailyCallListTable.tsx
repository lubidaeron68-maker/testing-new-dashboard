import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Filter, Loader2, Search } from 'lucide-react';
import type { DailyCallListFile } from '../types';
import { DAILY_CALL_LIST_COLUMNS, DAILY_CALL_LIST_HEADERS, dailyCsvCell, dailyFilterValue, formatDailyValue, type DailyCallColumnKey } from '../utils/dailyCallListSchema';
import { ColumnPicker } from './ColumnPicker';
import { MultiSelectFilter } from './MultiSelectFilter';
import { cn } from '../utils/cn';

const PAGE_SIZE = 15;
const CLIENT_SORT_LIMIT = 100_000;
const FILTERS = [
  { key: 'company_name', label: 'Companies', options: 'companies' },
  { key: 'agency_name', label: 'Agencies', options: 'agencies' },
  { key: 'partner_name', label: 'Partners', options: 'partners' },
  { key: 'product', label: 'Products', options: 'products' },
  { key: 'portfolio_date', label: 'Portfolio dates', options: 'portfolioDates' },
  { key: 'initial_dpd_bucket', label: 'Initial DPD buckets', options: 'dpdBuckets' },
] as const;
type FilterKey = typeof FILTERS[number]['key'];
type Filters = Record<FilterKey, string[]>;
const emptyFilters = (): Filters => ({ company_name: [], agency_name: [], partner_name: [], product: [], portfolio_date: [], initial_dpd_bucket: [] });
const columnOptions = DAILY_CALL_LIST_COLUMNS.map(({ key }) => ({ key, label: key }));

export function DailyCallListTable({ file }: { file: DailyCallListFile }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<{ key: DailyCallColumnKey; direction: 'asc' | 'desc' } | null>(null);
  const [visible, setVisible] = useState<Set<string>>(() => new Set(DAILY_CALL_LIST_HEADERS));
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim().toLowerCase()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = useMemo(() => {
    const active = FILTERS.filter(({ key, options }) => filters[key].length > 0 && filters[key].length < file[options].length)
      .map(({ key }) => ({ key, values: new Set(filters[key]) }));
    if (!active.length && !query) return file.records;
    return file.records.filter((record) => {
      if (active.some(({ key, values }) => !values.has(dailyFilterValue(record[key])))) return false;
      return !query || DAILY_CALL_LIST_HEADERS.some((key) => String(record[key] ?? '').toLowerCase().includes(query));
    });
  }, [file, filters, query]);

  const canClientSort = filtered.length <= CLIENT_SORT_LIMIT;
  const sorted = useMemo(() => {
    if (!sort || !canClientSort) return filtered;
    return [...filtered].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];
    const leftBlank = left === null || left === '';
    const rightBlank = right === null || right === '';
    if (leftBlank || rightBlank) return leftBlank === rightBlank ? 0 : leftBlank ? 1 : -1;
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'en', { numeric: true });
    return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sort, canClientSort]);

  const activeColumns = useMemo(() => DAILY_CALL_LIST_COLUMNS.filter(({ key }) => visible.has(key)), [visible]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = search !== '' || FILTERS.some(({ key }) => filters[key].length > 0);

  const exportCsv = async () => {
    if (exporting || sorted.length === 0) return;
    setExporting(true);
    setExportError('');
    try {
      const parts: BlobPart[] = ['\ufeff', activeColumns.map(({ key }) => dailyCsvCell(key)).join(',') + '\r\n'];
      for (let start = 0; start < sorted.length; start += 2000) {
        const end = Math.min(start + 2000, sorted.length);
        const lines: string[] = [];
        for (let index = start; index < end; index++) {
          lines.push(activeColumns.map(({ key }) => dailyCsvCell(sorted[index][key])).join(','));
        }
        parts.push(lines.join('\r\n') + '\r\n');
        if (end < sorted.length) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const url = URL.createObjectURL(new Blob(parts, { type: 'text/csv;charset=utf-8;' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `daily-call-list-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Could not export the selected rows. Try a smaller filter selection.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section aria-label="Daily Call List Records" className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Call List Records</h3>
            <p aria-live="polite" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Showing {rows.length} of {filtered.length.toLocaleString()} rows
              {filtered.length !== file.records.length && ` (filtered from ${file.records.length.toLocaleString()} total)`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search daily call list"
                placeholder="Search ID, debtor, mobile..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-64 max-w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting || !filtered.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? 'Exporting...' : `Export CSV (${filtered.length.toLocaleString()})`}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <ColumnPicker
            columns={columnOptions}
            visible={visible}
            onChange={setVisible}
            minimalKeys={['portfolio_date', 'agreement_id', 'debtor_name', 'company_name', 'product', 'os_current', 'dpd_current', 'mobile_phone_number']}
          />
          {FILTERS.map(({ key, label, options }) => (
            <div key={key} role="group" aria-label={`Daily ${label.toLowerCase()} filter`}>
              <MultiSelectFilter
                label={label}
                options={file[options]}
                selected={filters[key]}
                accent="sky"
                onChange={(selection) => { setFilters((previous) => ({ ...previous, [key]: selection })); setPage(1); }}
              />
            </div>
          ))}
          {hasFilters && (
            <button type="button" onClick={() => { setSearch(''); setQuery(''); setFilters(emptyFilters()); setPage(1); }} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40">
              Clear filters
            </button>
          )}
        </div>
        {exportError && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{exportError}</p>}
        {!canClientSort && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            Browser sorting is disabled above {CLIENT_SORT_LIMIT.toLocaleString()} matching rows to keep this page responsive. Filter the list below that size, then sort.
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Daily call list data">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              {activeColumns.map(({ key, kind }) => (
                <th key={key} scope="col" aria-sort={sort?.key === key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className={cn('whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300', (kind === 'amount' || kind === 'number') && 'text-right')}>
                  <button type="button" disabled={!canClientSort} title={!canClientSort ? `Filter below ${CLIENT_SORT_LIMIT.toLocaleString()} rows to sort` : `Sort by ${key}`} onClick={() => { setSort((previous) => ({ key, direction: previous?.key === key && previous.direction === 'asc' ? 'desc' : 'asc' })); setPage(1); }} className="inline-flex items-center gap-1.5 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-cyan-300">
                    {key}
                    {sort?.key !== key ? <ArrowUpDown className="h-3 w-3 text-slate-400" /> : sort.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-cyan-500" /> : <ArrowDown className="h-3 w-3 text-cyan-500" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {!rows.length ? (
              <tr><td colSpan={activeColumns.length} className="p-12 text-center text-slate-500 dark:text-slate-400">No daily call list rows match these filters.</td></tr>
            ) : rows.map((record) => (
              <tr key={record.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {activeColumns.map(({ key, kind }) => (
                  <td key={key} className={cn('whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300', (kind === 'amount' || kind === 'number') && 'text-right tabular-nums', kind === 'identifier' && 'font-mono text-xs')}>
                    {formatDailyValue(record[key], kind)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>IDs and mobile numbers are kept as text. Dates use YYYY-MM-DD when recognized.</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous daily page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {currentPage.toLocaleString()} of {pages.toLocaleString()}</span>
          <button type="button" aria-label="Next daily page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}
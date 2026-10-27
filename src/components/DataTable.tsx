import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  Loader2,
  Clock,
} from 'lucide-react';
import type { CollectionRecord } from '../types';
import { ColumnPicker } from './ColumnPicker';
import { MultiSelectFilter } from './MultiSelectFilter';
import { cn } from '../utils/cn';
import { convertTo12HourFormat } from '../utils/dateFormatter';

interface DataTableProps {
  records: CollectionRecord[];
  companies: string[];
  departments: string[];
  agents: string[];
  title?: string;
  exportFilePrefix?: string;
}

type SortField = keyof CollectionRecord;
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US').format(value);
}

const statusColors: Record<string, string> = {
  'Paid': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400',
  'Promised': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400',
  'Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400',
  'Refused': 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400',
  'No PTP': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const planStatusColors: Record<string, string> = {
  'Active': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400',
  'Completed': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400',
  'Defaulted': 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400',
  'Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400',
  'Cancelled': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'N/A': 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
};

const contactTypeColors: Record<string, string> = {
  'Right Party Contact': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400',
  'Right Party': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400',
  'Partial Contact': 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-400',
  'No Answer': 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400',
  'No Contact': 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400',
  'Left Message': 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-400',
  'Call Drop': 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-400',
  'Callback': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400',
  'Refuse to Pay': 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400',
};

interface Column {
  key: SortField;
  label: string;
  width?: string;
  render?: (record: CollectionRecord) => React.ReactNode;
}

const columns: Column[] = [
  { key: 'company', label: 'Company', width: 'w-24' },
  { key: 'agreementNumber', label: 'Agreement ID', width: 'w-32' },
  { key: 'department', label: 'Dept', width: 'w-20' },
  { key: 'initialDP', label: 'Init DPD', width: 'w-16', render: (r) => formatNumber(r.initialDP) },
  { key: 'actualDF', label: 'Act DPD', width: 'w-16', render: (r) => formatNumber(r.actualDF) },
  { key: 'agentName', label: 'Agent', width: 'w-28' },
  {
    key: 'contactType',
    label: 'Contact Type',
    width: 'w-36',
    render: (r) => (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
          contactTypeColors[r.contactType] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        )}
      >
        {r.contactType}
      </span>
    ),
  },
  { key: 'actionResult', label: 'Result', width: 'w-28' },
  {
    key: 'overdueAmount',
    label: 'Overdue',
    width: 'w-28',
    render: (r) => <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(r.overdueAmount)}</span>,
  },
  { key: 'overdueReason', label: 'Overdue Reason', width: 'w-32' },
  {
    key: 'ptpStatus',
    label: 'PTP Status',
    width: 'w-24',
    render: (r) => (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
          statusColors[r.ptpStatus] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        )}
      >
        {r.ptpStatus}
      </span>
    ),
  },
  {
    key: 'ptpDueDate',
    label: 'PTP Due Date',
    width: 'w-32',
    render: (r) => r.ptpDueDate || '-',
  },
  {
    key: 'ptpAmount',
    label: 'PTP Amt',
    width: 'w-24',
    render: (r) => formatCurrency(r.ptpAmount),
  },
  {
    key: 'ptpPaid',
    label: 'PTP Paid',
    width: 'w-24',
    render: (r) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.ptpPaid)}</span>,
  },
  { key: 'requestedPaymentChannel', label: 'Pmt Channel', width: 'w-28' },
  {
    key: 'executionTime',
    label: 'Execution Time (12-Hour)',
    width: 'w-48',
    render: (r) => (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
        <Clock className="h-3.5 w-3.5 text-indigo-500" />
        {convertTo12HourFormat(r.executionTime) || '-'}
      </span>
    ),
  },
  {
    key: 'paymentPlanStatus',
    label: 'Plan Status',
    width: 'w-24',
    render: (r) => (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
          planStatusColors[r.paymentPlanStatus] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        )}
      >
        {r.paymentPlanStatus || 'N/A'}
      </span>
    ),
  },
  {
    key: 'paymentPlanTargetAmount',
    label: 'Plan Target',
    width: 'w-24',
    render: (r) => formatCurrency(r.paymentPlanTargetAmount),
  },
  {
    key: 'paymentPlanNotPaidAmount',
    label: 'Plan Unpaid',
    width: 'w-24',
    render: (r) => <span className="text-amber-600 dark:text-amber-400">{formatCurrency(r.paymentPlanNotPaidAmount)}</span>,
  },
  {
    key: 'callDuration',
    label: 'Duration',
    width: 'w-20',
    render: (r) => (r.callDuration !== null ? `${r.callDuration} min` : '-'),
  },
  { key: 'date', label: 'Date', width: 'w-28' },
  { key: 'agentNotes', label: 'Notes', width: 'w-32' },
  { key: 'additionalAction', label: 'Addl Action', width: 'w-28' },
];

export function DataTable({ records, companies, departments, agents, title = 'Collection Records', exportFilePrefix = 'collection-records-12hr' }: DataTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('overdueAmount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  // Multi-select filters: empty array means "show all"
  const [filterCompany, setFilterCompany] = useState<string[]>([]);
  const [filterDept, setFilterDept] = useState<string[]>([]);
  const [filterAgent, setFilterAgent] = useState<string[]>([]);
  const [filterResult, setFilterResult] = useState<string[]>([]);
  const [filterPTP, setFilterPTP] = useState<string[]>([]);
  // Column visibility — every column starts visible
  const [visibleColumns, setVisibleColumns] = useState<Set<SortField>>(
    () => new Set<SortField>(columns.map((column) => column.key))
  );
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search input by 250ms to keep UI snappy on large datasets
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Unique option lists for the multi-select filters (computed once per dataset)
  const ptpStatuses = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < records.length; i++) {
      if (records[i].ptpStatus) set.add(records[i].ptpStatus);
    }
    return Array.from(set).sort();
  }, [records]);

  const actionResults = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < records.length; i++) {
      const result = records[i].actionResult?.trim();
      if (result) set.add(result);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Fast short-circuit filtering using Set membership for O(1) multi-select checks.
  const filteredRecords = useMemo(() => {
    const s = debouncedSearch;
    const hasSearch = Boolean(s);
    // Empty selection = show all (no filter applied)
    const hasCompany = filterCompany.length > 0 && filterCompany.length < companies.length;
    const hasDept = filterDept.length > 0 && filterDept.length < departments.length;
    const hasAgent = filterAgent.length > 0 && filterAgent.length < agents.length;
    const hasResult = filterResult.length > 0 && filterResult.length < actionResults.length;
    const hasPTP = filterPTP.length > 0 && filterPTP.length < ptpStatuses.length;

    if (!hasSearch && !hasCompany && !hasDept && !hasAgent && !hasResult && !hasPTP) {
      return records;
    }

    // Pre-build Sets for O(1) membership lookups
    const companySet = hasCompany ? new Set(filterCompany) : null;
    const deptSet = hasDept ? new Set(filterDept) : null;
    const agentSet = hasAgent ? new Set(filterAgent) : null;
    const resultSet = hasResult ? new Set(filterResult) : null;
    const ptpSet = hasPTP ? new Set(filterPTP) : null;

    return records.filter((r) => {
      if (companySet && !companySet.has(r.company)) return false;
      if (deptSet && !deptSet.has(r.department)) return false;
      if (agentSet && !agentSet.has(r.agentName)) return false;
      if (resultSet && !resultSet.has(r.actionResult)) return false;
      if (ptpSet && !ptpSet.has(r.ptpStatus)) return false;

      if (hasSearch) {
        const matches =
          (r.company && r.company.toLowerCase().includes(s)) ||
          (r.agreementNumber && r.agreementNumber.toLowerCase().includes(s)) ||
          (r.agentName && r.agentName.toLowerCase().includes(s)) ||
          (r.actionResult && r.actionResult.toLowerCase().includes(s)) ||
          (r.dialedPhone && r.dialedPhone.includes(s)) ||
          (r.agentNotes && r.agentNotes.toLowerCase().includes(s)) ||
          (r.overdueReason && r.overdueReason.toLowerCase().includes(s)) ||
          (r.executionTime && r.executionTime.toLowerCase().includes(s)) ||
          (r.agentLog && r.agentLog.toLowerCase().includes(s));
        if (!matches) return false;
      }

      return true;
    });
  }, [
    records,
    debouncedSearch,
    filterCompany,
    filterDept,
    filterAgent,
    filterResult,
    filterPTP,
    companies.length,
    departments.length,
    agents.length,
    actionResults.length,
    ptpStatuses.length,
  ]);

  // Columns currently displayed in the table (and CSV export)
  const activeColumns = useMemo(
    () => columns.filter((column) => visibleColumns.has(column.key)),
    [visibleColumns]
  );

  const sortedRecords = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    return [...filteredRecords].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredRecords, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sortedRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedRecords, page]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setFilterCompany([]);
    setFilterDept([]);
    setFilterAgent([]);
    setFilterResult([]);
    setFilterPTP([]);
    setPage(1);
  };

  const hasFilters = Boolean(
    searchInput ||
      filterCompany.length > 0 ||
      filterDept.length > 0 ||
      filterAgent.length > 0 ||
      filterResult.length > 0 ||
      filterPTP.length > 0
  );

  const exportToCSV = async () => {
    if (isExporting || sortedRecords.length === 0 || activeColumns.length === 0) return;
    setIsExporting(true);

    try {
      const headerLine = activeColumns.map((c) => `"${c.label}"`).join(',') + '\n';
      const parts: BlobPart[] = [headerLine];

      const CHUNK_SIZE = 5000;
      for (let i = 0; i < sortedRecords.length; i += CHUNK_SIZE) {
        const slice = sortedRecords.slice(i, i + CHUNK_SIZE);
        const chunkStr =
          slice
            .map((r) =>
              activeColumns
                .map((c) => {
                  let val = r[c.key];
                  if (c.key === 'executionTime') {
                    val = convertTo12HourFormat(r.executionTime);
                  }
                  if (val === null || val === undefined) return '""';
                  return `"${String(val).replace(/"/g, '""')}"`;
                })
                .join(',')
            )
            .join('\n') + '\n';

        parts.push(chunkStr);

        if (i + CHUNK_SIZE < sortedRecords.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const blob = new Blob(parts, { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                12-Hour Converted
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Showing {paginatedRecords.length} of {filteredRecords.length.toLocaleString()} records
              {filteredRecords.length !== records.length &&
                ` (filtered from ${records.length.toLocaleString()} total)`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search accounts, names, time..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export CSV ({sortedRecords.length.toLocaleString()})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />

          {/* Choose which columns are displayed */}
          <ColumnPicker
            columns={columns.map((column) => ({ key: column.key as string, label: column.label }))}
            visible={visibleColumns as Set<string>}
            onChange={(next) => setVisibleColumns(new Set(Array.from(next) as SortField[]))}
            minimalKeys={[
              'company',
              'agreementNumber',
              'agentName',
              'actionResult',
              'ptpStatus',
              'ptpAmount',
              'executionTime',
            ]}
          />

          {/* Multi-select filters — pick multiple values per field */}
          <MultiSelectFilter
            label="Companies"
            options={companies}
            selected={filterCompany}
            onChange={(next) => {
              setFilterCompany(next);
              setPage(1);
            }}
            accent="indigo"
          />
          <MultiSelectFilter
            label="Departments"
            options={departments}
            selected={filterDept}
            onChange={(next) => {
              setFilterDept(next);
              setPage(1);
            }}
            accent="violet"
          />
          <MultiSelectFilter
            label="Agents"
            options={agents}
            selected={filterAgent}
            onChange={(next) => {
              setFilterAgent(next);
              setPage(1);
            }}
            accent="sky"
            maxLabelWidth="max-w-[160px]"
          />
          <MultiSelectFilter
            label="Results"
            options={actionResults}
            selected={filterResult}
            onChange={(next) => {
              setFilterResult(next);
              setPage(1);
            }}
            accent="amber"
            maxLabelWidth="max-w-[160px]"
          />
          <MultiSelectFilter
            label="PTP Status"
            options={ptpStatuses}
            selected={filterPTP}
            onChange={(next) => {
              setFilterPTP(next);
              setPage(1);
            }}
            accent="emerald"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn('whitespace-nowrap px-4 py-3 text-left font-semibold', col.width)}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    {col.label}
                    <SortIcon field={col.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                  No records found. Try adjusting your search or filters.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => (
                <tr
                  key={record.id}
                  className="transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/60"
                >
                  {activeColumns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300"
                    >
                      {col.render ? col.render(record) : String(record[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {page} / {totalPages.toLocaleString()}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { DailyPortfolioSummaryRow } from '../types';
import { dailyCsvCell, formatDailyValue } from '../utils/dailyCallListSchema';

const PAGE_SIZE = 30;

export function DailyCallListSummary({ days }: { days: DailyPortfolioSummaryRow[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(days.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);

  const exportSummary = () => {
    const headers = ['portfolio_date', 'rows', 'os_current', 'targeted_amount_current', 'average_dpd_current'];
    const rows = days.map((day) => [day.date, day.rows, day.outstanding, day.target, day.averageDpd].map(dailyCsvCell).join(','));
    const url = URL.createObjectURL(new Blob(['\ufeff', headers.join(',') + '\r\n', rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'daily-call-list-portfolio-summary.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section aria-label="Daily portfolio summary" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-800">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Daily Call List Portfolio Summary</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Grouped by portfolio_date. Amounts sum the uploaded rows within each date.</p>
        </div>
        <button type="button" onClick={exportSummary} disabled={!days.length} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Download className="h-4 w-4" />Export portfolio summary</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60"><tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            {['Portfolio date', 'Rows', 'Current outstanding', 'Targeted amount', 'Avg current DPD'].map((label, i) => <th key={label} className={`whitespace-nowrap px-4 py-3 ${i ? 'text-right' : ''}`}>{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {days.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((day) => <tr key={day.date} className="text-slate-700 dark:text-slate-200">
              <td className="whitespace-nowrap px-4 py-3">{day.date || '(No portfolio date)'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{day.rows.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatDailyValue(day.outstanding, 'amount')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatDailyValue(day.target, 'amount')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{day.averageDpd === null ? '-' : day.averageDpd.toFixed(1)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <p>This file contains portfolio data, not completed-call results. RPC, PTP, and call duration are not inferred.</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous summary page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {currentPage} of {pages}</span>
          <button type="button" aria-label="Next summary page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}
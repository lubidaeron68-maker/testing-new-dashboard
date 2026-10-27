import type { DailyCallRecord } from '../types';

export type DailyCallColumnKey = Exclude<keyof DailyCallRecord, 'id'>;

export const DAILY_CALL_LIST_COLUMNS = [
  { key: 'portfolio_date', kind: 'date' },
  { key: 'customer_rk', kind: 'identifier' },
  { key: 'agreement_rk', kind: 'identifier' },
  { key: 'agreement_id', kind: 'identifier' },
  { key: 'agency_name', kind: 'text' },
  { key: 'debtor_name', kind: 'text' },
  { key: 'partner_name', kind: 'text' },
  { key: 'company_name', kind: 'text' },
  { key: 'product', kind: 'text' },
  { key: 'date_of_assignment', kind: 'date' },
  { key: 'date_of_abortion', kind: 'date' },
  { key: 'os_current', kind: 'amount' },
  { key: 'dpd_current', kind: 'number' },
  { key: 'targeted_amount_current', kind: 'amount' },
  { key: 'initial_dpd_bucket', kind: 'text' },
  { key: 'initial_dpd', kind: 'number' },
  { key: 'mobile_phone_number', kind: 'identifier' },
] as const satisfies readonly { key: DailyCallColumnKey; kind: string }[];

export const DAILY_CALL_LIST_HEADERS = DAILY_CALL_LIST_COLUMNS.map(({ key }) => key);

const headerKeys = new Map(DAILY_CALL_LIST_HEADERS.map((key) => [key.replace(/_/g, ''), key]));

export function matchDailyCallHeader(value: unknown): DailyCallColumnKey | undefined {
  return headerKeys.get(String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
}

export function dailyFilterValue(value: string): string {
  return value || '(Blank)';
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });
const amountFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });

export function formatDailyValue(value: string | number | null, kind: string): string {
  if (value === '' || value === null) return '-';
  if (typeof value !== 'number') return value;
  return kind === 'amount' ? amountFormatter.format(value) : numberFormatter.format(value);
}

export function dailyCsvCell(value: string | number | null): string {
  let text = value === null ? '' : String(value);
  // Neutralize spreadsheet formulas in text without altering numeric phone numbers.
  if (typeof value === 'string' && /^[=+@-]/.test(text) && !/^[+-]?\d+$/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
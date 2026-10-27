import * as XLSX from 'xlsx';
import type { DailyCallListFile, DailyCallRecord, ParseProgress } from '../types';
import { DAILY_CALL_LIST_HEADERS, dailyFilterValue, matchDailyCallHeader, type DailyCallColumnKey } from './dailyCallListSchema';
import { estimateRecordHeap, formatBytes } from './memory';

export const DAILY_CALL_LIST_MAX_BYTES = 300 * 1024 * 1024;

export function validateDailyCallListFile(file: File): void {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error('Please choose a Daily Call List in .xlsx, .xls, or .csv format.');
  }
  if (file.size === 0) {
    throw new Error('This file is empty. Choose a Daily Call List with data rows.');
  }
  if (file.size > DAILY_CALL_LIST_MAX_BYTES) {
    throw new Error(`The Daily Call List file is ${formatBytes(file.size)}. The file limit is 300 MB.`);
  }
}

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function cellText(cell?: XLSX.CellObject): string {
  if (!cell || cell.t === 'z' || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

function identifier(cell: XLSX.CellObject | undefined, column: string, row: number): string {
  if (!cell || cell.t !== 'n') return cellText(cell);
  if (typeof cell.v !== 'number' || !Number.isSafeInteger(cell.v) || Math.abs(cell.v) >= 1e15) {
    throw new Error(`Row ${row}, ${column}: save identifiers and phone numbers as Text in Excel to preserve every digit.`);
  }
  // Honor zero-padded number formats, but avoid Excel's scientific display format.
  if (typeof cell.z === 'string' && /0{2,}/.test(cell.z) && !/[eE][+-]/.test(cell.z)) {
    return XLSX.utils.format_cell(cell);
  }
  return String(cell.v);
}

function numeric(cell: XLSX.CellObject | undefined, column: string, row: number): number | null {
  const raw = cellText(cell);
  if (!raw || /^(?:-|n\/?a|null)$/i.test(raw)) return null;
  let cleaned = raw.replace(/^(?:PHP|\$|\u20b1)\s*/i, '').replace(/[,\s]/g, '');
  if (/^\([\d.]+\)$/.test(cleaned)) cleaned = `-${cleaned.slice(1, -1)}`;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || !/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(cleaned)) {
    throw new Error(`Row ${row}, ${column}: "${raw.slice(0, 60)}" is not a valid number.`);
  }
  return value;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateValue(cell: XLSX.CellObject | undefined, date1904: boolean): string {
  if (!cell) return '';
  const text = cellText(cell);
  if (!text || /^(?:-|n\/?a|null)$/i.test(text)) return '';
  if (cell.v instanceof Date) {
    return isoDate(cell.v.getFullYear(), cell.v.getMonth() + 1, cell.v.getDate()) || text;
  }
  if (typeof cell.v === 'number' || /^\d{5}(?:\.\d+)?$/.test(text)) {
    const parts = XLSX.SSF.parse_date_code(Number(cell.v), { date1904 });
    return parts ? isoDate(parts.y, parts.m, parts.d) || text : text;
  }
  const yearFirst = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (yearFirst) return isoDate(+yearFirst[1], +yearFirst[2], +yearFirst[3]) || text;
  const dayFirst = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s].*)?$/);
  if (dayFirst) {
    const first = +dayFirst[1];
    const second = +dayFirst[2];
    return (second > 12 ? isoDate(+dayFirst[3], first, second) : isoDate(+dayFirst[3], second, first)) || text;
  }
  // Keep unfamiliar date text rather than silently discarding source data.
  return text;
}

type DenseRows = (Array<XLSX.CellObject | undefined> | undefined)[];

export async function importDailyCallListDirect(
  file: File,
  availableHeapBytes: number,
  onProgress: (progress: ParseProgress) => void
): Promise<DailyCallListFile> {
  validateDailyCallListFile(file);
  if (availableHeapBytes <= 0) {
    throw new Error('Not enough memory budget is available. Remove a loaded file and try again.');
  }

  onProgress({ stage: 'reading', percent: 0, message: `Reading ${file.name}...` });
  let buffer: ArrayBuffer | null = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Could not read the Daily Call List file.'));
    reader.onabort = () => reject(new Error('Daily Call List file reading was cancelled.'));
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress({ stage: 'reading', percent: Math.round(event.loaded / event.total * 15), message: `Reading ${file.name}...` });
    };
    reader.readAsArrayBuffer(file);
  });

  onProgress({ stage: 'parsing', percent: 20, message: 'Reading the daily worksheet and its 17-column mapping...' });
  await yieldToBrowser();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: 'array', dense: true, raw: true, sheets: 0,
      codepage: /\.csv$/i.test(file.name) ? 65001 : undefined,
      cellDates: false, cellNF: true, cellText: false,
      cellStyles: false, cellHTML: false, cellFormula: false,
    });
  } catch {
    throw new Error('Could not decode the Daily Call List. Check that the file is not damaged or password-protected.');
  } finally {
    buffer = null;
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) throw new Error('No data rows were found in the Daily Call List. Check the first worksheet.');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const denseRows: DenseRows | undefined = Array.isArray(sheet)
    ? sheet as unknown as DenseRows
    : (sheet as XLSX.WorkSheet & { '!data'?: DenseRows })['!data'];
  const getCell = (row: number, column: number): XLSX.CellObject | undefined =>
    denseRows ? denseRows[row]?.[column] : sheet[XLSX.utils.encode_cell({ r: row, c: column })];

  let headerRow = range.s.r;
  let mapping = new Map<DailyCallColumnKey, number>();
  let duplicates: string[] = [];
  // Accommodate a short report title above the actual header, without copying the sheet.
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 24); r++) {
    const candidate = new Map<DailyCallColumnKey, number>();
    const repeated: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const key = matchDailyCallHeader(getCell(r, c)?.v);
      if (key) {
        if (candidate.has(key)) repeated.push(key);
        else candidate.set(key, c);
      }
    }
    if (candidate.size > mapping.size) {
      mapping = candidate;
      headerRow = r;
      duplicates = repeated;
    }
    if (mapping.size === DAILY_CALL_LIST_HEADERS.length) break;
  }
  const missing = DAILY_CALL_LIST_HEADERS.filter((key) => !mapping.has(key));
  if (missing.length) throw new Error(`Missing Daily Call List columns: ${missing.join(', ')}. Use the 17-column daily template, not the collections-report template.`);
  if (duplicates.length) throw new Error(`Duplicate Daily Call List columns: ${duplicates.join(', ')}. Each header must appear once.`);

  const records: DailyCallRecord[] = [];
  const companies = new Set<string>();
  const agencies = new Set<string>();
  const partners = new Set<string>();
  const products = new Set<string>();
  const portfolioDates = new Set<string>();
  const dpdBuckets = new Set<string>();
  const summary = new Map<string, {
    rows: number;
    outstanding: number;
    outstandingCount: number;
    target: number;
    targetCount: number;
    dpd: number;
    dpdCount: number;
  }>();
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  let estimatedHeap = 0;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const at = (key: DailyCallColumnKey) => getCell(r, mapping.get(key)!);
    const hasData = DAILY_CALL_LIST_HEADERS.some((key) => cellText(at(key)) !== '');
    if (hasData) {
      const record: DailyCallRecord = {
        id: `daily-row-${r + 1}`,
        portfolio_date: dateValue(at('portfolio_date'), date1904),
        customer_rk: identifier(at('customer_rk'), 'customer_rk', r + 1),
        agreement_rk: identifier(at('agreement_rk'), 'agreement_rk', r + 1),
        agreement_id: identifier(at('agreement_id'), 'agreement_id', r + 1),
        agency_name: cellText(at('agency_name')),
        debtor_name: cellText(at('debtor_name')),
        partner_name: cellText(at('partner_name')),
        company_name: cellText(at('company_name')),
        product: cellText(at('product')),
        date_of_assignment: dateValue(at('date_of_assignment'), date1904),
        date_of_abortion: dateValue(at('date_of_abortion'), date1904),
        os_current: numeric(at('os_current'), 'os_current', r + 1),
        dpd_current: numeric(at('dpd_current'), 'dpd_current', r + 1),
        targeted_amount_current: numeric(at('targeted_amount_current'), 'targeted_amount_current', r + 1),
        initial_dpd_bucket: cellText(at('initial_dpd_bucket')),
        initial_dpd: numeric(at('initial_dpd'), 'initial_dpd', r + 1),
        mobile_phone_number: identifier(at('mobile_phone_number'), 'mobile_phone_number', r + 1),
      };
      const stringBytes = Object.values(record).reduce<number>((sum, value) => sum + (typeof value === 'string' ? value.length * 2 : 0), 0);
      estimatedHeap += Math.max(estimateRecordHeap(1), 320 + stringBytes);
      if (estimatedHeap > availableHeapBytes) {
        throw new Error('This Daily Call List exceeds the remaining memory budget. Remove a loaded file or split the daily file. Your current data has not been changed.');
      }
      records.push(record);
      companies.add(dailyFilterValue(record.company_name));
      agencies.add(dailyFilterValue(record.agency_name));
      partners.add(dailyFilterValue(record.partner_name));
      products.add(dailyFilterValue(record.product));
      portfolioDates.add(dailyFilterValue(record.portfolio_date));
      dpdBuckets.add(dailyFilterValue(record.initial_dpd_bucket));
      let daily = summary.get(record.portfolio_date);
      if (!daily) {
        daily = { rows: 0, outstanding: 0, outstandingCount: 0, target: 0, targetCount: 0, dpd: 0, dpdCount: 0 };
        summary.set(record.portfolio_date, daily);
      }
      daily.rows++;
      if (record.os_current !== null) { daily.outstanding += record.os_current; daily.outstandingCount++; }
      if (record.targeted_amount_current !== null) { daily.target += record.targeted_amount_current; daily.targetCount++; }
      if (record.dpd_current !== null) { daily.dpd += record.dpd_current; daily.dpdCount++; }
    }

    // Release parsed source cells as each batch is mapped; do not create a second raw-row array.
    if (denseRows) denseRows[r] = undefined;
    if ((r - headerRow) % 4000 === 0) {
      onProgress({ stage: 'mapping', percent: 30 + Math.round((r - headerRow) / Math.max(1, range.e.r - headerRow) * 65), message: `Mapped ${records.length.toLocaleString()} daily call list rows...`, rowCount: records.length });
      await yieldToBrowser();
    }
  }
  if (!records.length) throw new Error('No data rows were found in the Daily Call List. Check the first worksheet.');
  delete workbook.Sheets[sheetName];
  onProgress({ stage: 'done', percent: 100, message: `Loaded ${records.length.toLocaleString()} daily call list rows.`, rowCount: records.length });

  const now = new Date();
  return {
    id: `daily-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    sourceBytes: file.size,
    uploadedLabel: now.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }),
    sheetName,
    records,
    companies: Array.from(companies).sort(),
    agencies: Array.from(agencies).sort(),
    partners: Array.from(partners).sort(),
    products: Array.from(products).sort(),
    portfolioDates: Array.from(portfolioDates).sort(),
    dpdBuckets: Array.from(dpdBuckets).sort(),
    portfolioSummary: Array.from(summary, ([date, value]) => ({
      date,
      rows: value.rows,
      outstanding: value.outstandingCount ? value.outstanding : null,
      target: value.targetCount ? value.target : null,
      averageDpd: value.dpdCount ? value.dpd / value.dpdCount : null,
    })).sort((a, b) => !a.date ? 1 : !b.date ? -1 : b.date.localeCompare(a.date)),
    heapBytes: estimatedHeap,
  };
}
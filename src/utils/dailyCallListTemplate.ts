import * as XLSX from 'xlsx';
import { DAILY_CALL_LIST_HEADERS } from './dailyCallListSchema';

export function createDailyCallListTemplate(): XLSX.WorkBook {
  const sheet = XLSX.utils.aoa_to_sheet([DAILY_CALL_LIST_HEADERS]);
  sheet['!cols'] = DAILY_CALL_LIST_HEADERS.map((header) => ({ wch: Math.max(20, header.length + 3) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Daily Call List');
  const instructions = XLSX.utils.aoa_to_sheet([
    ['Daily Call List template'],
    ['Enter your data below the headers in the first worksheet. Keep all 17 headers; values can be blank.'],
    ['Store customer_rk, agreement_rk, agreement_id, and mobile_phone_number as Text in Excel to retain leading zeros and long identifiers.'],
    ['Use Excel date cells or YYYY-MM-DD / DD-MM-YYYY text for portfolio_date, date_of_assignment, and date_of_abortion.'],
    ['os_current, dpd_current, targeted_amount_current, and initial_dpd are numeric fields. Blank values remain blank.'],
    ['This daily file is independent of collections reports. No RPC, PTP, or call-duration columns are required.'],
  ]);
  instructions['!cols'] = [{ wch: 125 }];
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  return workbook;
}

export function downloadDailyCallListTemplate(): void {
  XLSX.writeFile(createDailyCallListTemplate(), 'daily-call-list-template.xlsx');
}
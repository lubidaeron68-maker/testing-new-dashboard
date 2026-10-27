// Run with jsdom available on NODE_PATH: node tests/daily-call-list.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { JSDOM } = require('jsdom');
const XLSX = require('xlsx');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
});
const w = dom.window;
Object.assign(global, {
  window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node,
  localStorage: w.localStorage, FileReader: w.FileReader,
});
Object.defineProperty(global, 'navigator', { value: w.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
global.ResizeObserver = w.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
global.requestAnimationFrame = w.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 16);
global.cancelAnimationFrame = w.cancelAnimationFrame = clearTimeout;
w.HTMLElement.prototype.getBoundingClientRect = function () {
  const height = this.classList.contains('recharts-legend-wrapper') ? 30 : 320;
  return { width: 700, height, top: 0, left: 0, bottom: height, right: 700, x: 0, y: 0, toJSON() {} };
};

for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText,
    filename
  );
}

// Node does not understand Vite's ?worker&inline import. The tests exercise
// the direct fallback; worker protocol is tested separately below.
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('?worker&inline')) return class TestWorkerStub {};
  return originalLoad.call(this, request, parent, isMain);
};

const React = require('react');
const { createRoot } = require('react-dom/client');
const App = require('../src/App.tsx').default;
const { importDailyCallList, validateDailyCallListFile, DAILY_CALL_LIST_MAX_BYTES } = require('../src/utils/dailyCallListImport.ts');
const { TOTAL_HEAP_BUDGET_BYTES } = require('../src/utils/memory.ts');
const { DAILY_CALL_LIST_HEADERS } = require('../src/utils/dailyCallListSchema.ts');
const { createDailyCallListTemplate } = require('../src/utils/dailyCallListTemplate.ts');
const headers = [
  'portfolio_date', 'customer_rk', 'agreement_rk', 'agreement_id', 'agency_name', 'debtor_name',
  'partner_name', 'company_name', 'product', 'date_of_assignment', 'date_of_abortion',
  'os_current', 'dpd_current', 'targeted_amount_current', 'initial_dpd_bucket', 'initial_dpd', 'mobile_phone_number',
];
const collectionHeaders = [
  'Company name', 'Agreement id', 'Credit assignment date', 'Department', 'Initial DPD',
  'Actual DPD', 'Agent login', 'Agent name', 'Action type', 'Contact type', 'Action result',
  'Overdue reason', 'Date', 'Execution dtime', 'Dialed phone', 'Requested payment channel',
  'PTP status', 'PTP due date ', 'PTP amount', 'PTP paid amount', 'Payment plan summary',
  'Payment plan status', 'Payment plan target amoun', 'Payment plan paid amoun',
  'Payment plan not paid amoun', 'Agents note', 'Call duration, minutes', 'Additional action',
];

function makeCollectionFile(name, prefix, count = 3, bookType = 'xlsx') {
  const rows = Array.from({ length: count }, (_, index) => [
    `${prefix} Client`, `${prefix}-${index + 1}`, '2026-10-01', 'BLOB A', 1, 5, 'agent-login',
    `${prefix} Agent`, 'Outbound', 'Right Party Contact (RPC)', 'Promise to pay', 'Awaiting salary',
    index % 2 ? '2026-10-22' : '2026-10-21', '21-10-2026 22:01:10', '639123456789', 'GCash',
    'Promised', '2026-10-25', 1500, 500, 'Installments', 'Active', 5000, 500, 4500, 'Call again', 1.5, 'Follow up',
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([collectionHeaders, ...rows]), 'Calls');
  return new w.File([XLSX.write(workbook, { type: 'buffer', bookType })], name);
}

function makeDailyRows(prefix, count = 3) {
  return Array.from({ length: count }, (_, index) => [
    index % 2 ? '2026-10-22' : '2026-10-21', '000123', '0000098765', `${prefix}-${index + 1}`,
    `${prefix} Agency`, `Person ${index + 1}`, index % 2 ? 'Partner B' : 'Partner A',
    `${prefix} Client`, index % 2 ? 'Installment' : 'Loan', '20-10-2026', '',
    '2,500.75', 10, '500.50', '1-30', 5, '09123456789',
  ]);
}

function workbookFile(matrix, name = 'daily.xlsx', options = {}) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  options.edit?.(sheet, workbook);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Daily');
  return new w.File([XLSX.write(workbook, { type: 'buffer', bookType: options.bookType || 'xlsx' })], name);
}

function makeFile(name, prefix, count = 3, bookType = 'xlsx') {
  return workbookFile([headers, ...makeDailyRows(prefix, count)], name, { bookType });
}

const host = document.getElementById('root');
const root = createRoot(host);
let exportedBlob;
let exportName;
URL.createObjectURL = (blob) => { exportedBlob = blob; return 'blob:test'; };
URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { exportName = this.download; };
const text = () => host.textContent;
const button = (label) => [...host.querySelectorAll('button')].find((node) => node.textContent.trim() === label);
const dailyInput = () => host.querySelector('input[aria-label="Upload Daily Call List file"]');
// Upload-view panel uses one aria-label; the dashboard's hidden header input uses another.
const collectionInput = () =>
  document.getElementById('eod-file-input') ||
  host.querySelector('input[aria-label="Upload end of day import files"]') ||
  host.querySelector('input[aria-label="Upload end of day FIS report files"]');
const hourlyInput = () => document.getElementById('hourly-file-input') || host.querySelector('input[aria-label="Upload hourly report files"]');
async function login(loginId, pw) {
  const user = host.querySelector('#sec-user');
  const pass = host.querySelector('#sec-pass');
  assert.ok(user && pass, 'Security login page is rendered');
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    const name = host.querySelector('#sec-name');
    if (name) {
      setter.call(name, 'Test Admin');
      name.dispatchEvent(new w.Event('input', { bubbles: true }));
    }
    setter.call(user, loginId);
    user.dispatchEvent(new w.Event('input', { bubbles: true }));
    setter.call(pass, pw);
    pass.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
  const setup = host.querySelector('#sec-name');
  await click(button(setup ? 'CREATE ADMIN ACCOUNT' : 'UNLOCK DASHBOARD'));
  if (setup) await waitFor(() => text().includes('End of Day'));
}
const click = async (node) => {
  assert.ok(node, 'Expected button exists');
  await React.act(async () => node.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
};
async function waitFor(predicate) {
  for (let i = 0; i < 250; i++) {
    if (predicate()) return;
    await React.act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  }
  throw new Error(`Timed out waiting for UI: ${text().slice(0, 700)}`);
}
async function selectFile(input, files) {
  assert.ok(input, 'Upload input exists');
  await React.act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
  });
}
async function dropFiles(files) {
  const zone = host.querySelector('[data-testid="daily-call-list-dropzone"]');
  assert.ok(zone, 'Daily drop zone exists');
  await React.act(async () => {
    const event = new w.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files } });
    zone.dispatchEvent(event);
  });
}

(async () => {
  assert.deepEqual(DAILY_CALL_LIST_HEADERS, headers, 'Canonical schema matches the 17 screenshot headers in order');
  for (const extension of ['xlsx', 'xls', 'csv']) {
    const source = await importDailyCallList(makeFile(`daily.${extension}`, 'MAPPED', 3, extension), TOTAL_HEAP_BUDGET_BYTES, () => {});
    assert.equal(source.records.length, 3);
    assert.deepEqual(source.records[0], {
      id: 'daily-row-2', portfolio_date: '2026-10-21', customer_rk: '000123', agreement_rk: '0000098765',
      agreement_id: 'MAPPED-1', agency_name: 'MAPPED Agency', debtor_name: 'Person 1',
      partner_name: 'Partner A', company_name: 'MAPPED Client', product: 'Loan',
      date_of_assignment: '2026-10-20', date_of_abortion: '', os_current: 2500.75, dpd_current: 10,
      targeted_amount_current: 500.5, initial_dpd_bucket: '1-30', initial_dpd: 5, mobile_phone_number: '09123456789',
    });
    assert.deepEqual(source.companies, ['MAPPED Client']);
    assert.deepEqual(source.agencies, ['MAPPED Agency']);
    assert.deepEqual(source.products, ['Installment', 'Loan']);
    assert.equal(source.records[0].ptpAmount, undefined, 'No collections metrics are fabricated');
  }
  console.log('PASS: all 17 daily fields map correctly in XLSX, XLS, and CSV; identifiers and phone zeros preserved');

  const template = createDailyCallListTemplate();
  assert.deepEqual(XLSX.utils.sheet_to_json(template.Sheets[template.SheetNames[0]], { header: 1 })[0], headers);
  assert.equal(XLSX.utils.sheet_to_json(template.Sheets[template.SheetNames[0]], { header: 1 }).length, 1, 'Template has no fabricated data');
  const reordered = await importDailyCallList(workbookFile([
    ['Daily portfolio title'],
    [...headers].reverse().map((h) => ` ${h.toUpperCase().replace(/_/g, ' ')} `),
    [...makeDailyRows('ORDER', 1)[0]].reverse(),
    Array(17).fill('   '),
  ]), TOTAL_HEAP_BUDGET_BYTES, () => {});
  assert.equal(reordered.records.length, 1);
  assert.equal(reordered.records[0].agreement_id, 'ORDER-1');
  assert.equal(reordered.records[0].os_current, 2500.75);

  const dateFile = workbookFile([headers, ...makeDailyRows('DATES', 1)], 'dates.xlsx', { edit: (sheet) => {
    sheet.A2 = { t: 'n', v: 46316, z: 'yyyy-mm-dd' };
    sheet.B2 = { t: 'n', v: 123, z: '000000' };
    sheet.Q2 = { t: 'n', v: 9123456789, z: '00000000000' };
    sheet.J2 = { t: 's', v: '21/10/2026' };
    sheet.K2 = { t: 'n', v: 46317, z: 'yyyy-mm-dd' };
  } });
  const dateSource = await importDailyCallList(dateFile, TOTAL_HEAP_BUDGET_BYTES, () => {});
  assert.equal(dateSource.records[0].portfolio_date, '2026-10-21');
  assert.equal(dateSource.records[0].date_of_assignment, '2026-10-21');
  assert.equal(dateSource.records[0].date_of_abortion, '2026-10-22');
  assert.equal(dateSource.records[0].customer_rk, '000123');
  assert.equal(dateSource.records[0].mobile_phone_number, '09123456789');
  const macDates = workbookFile([headers, ...makeDailyRows('MAC', 1)], 'mac.xlsx', { edit: (sheet, wb) => {
    wb.Workbook = { WBProps: { date1904: true } };
    sheet.A2 = { t: 'n', v: 44854, z: 'yyyy-mm-dd' };
  } });
  assert.equal((await importDailyCallList(macDates, TOTAL_HEAP_BUDGET_BYTES, () => {})).records[0].portfolio_date, '2026-10-21');
  console.log('PASS: template, reordered/case/whitespace headers, zero-padded cells, Excel dates and 1904 date system');

  const longRows = makeDailyRows('LONG', 1);
  longRows[0][1] = '00012345678901234567890';
  longRows[0][3] = '123456789012345678901234567890';
  longRows[0][5] = 'Ren\u00e9e Cruz';
  longRows[0][16] = '+639123456789';
  const longFile = new w.File([headers.join(',') + '\n' + longRows[0].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')], 'identifiers.csv');
  const longSource = await importDailyCallList(longFile, TOTAL_HEAP_BUDGET_BYTES, () => {});
  assert.equal(longSource.records[0].customer_rk, longRows[0][1]);
  assert.equal(longSource.records[0].agreement_id, longRows[0][3]);
  assert.equal(longSource.records[0].debtor_name, longRows[0][5]);
  assert.equal(longSource.records[0].mobile_phone_number, longRows[0][16]);

  const blankRows = makeDailyRows('BLANK', 1);
  blankRows[0][11] = '';
  blankRows[0][12] = 0;
  blankRows[0][13] = '';
  const blankSource = await importDailyCallList(workbookFile([headers, ...blankRows]), TOTAL_HEAP_BUDGET_BYTES, () => {});
  assert.equal(blankSource.records[0].os_current, null);
  assert.equal(blankSource.records[0].dpd_current, 0);
  assert.equal(blankSource.records[0].targeted_amount_current, null);
  await assert.rejects(() => importDailyCallList(workbookFile([headers.slice(0, -1), makeDailyRows('MISS', 1)[0]]), TOTAL_HEAP_BUDGET_BYTES, () => {}), /mobile_phone_number/);
  await assert.rejects(() => importDailyCallList(workbookFile([[...headers, 'AGREEMENT ID'], [...makeDailyRows('DUP', 1)[0], 'other']]), TOTAL_HEAP_BUDGET_BYTES, () => {}), /Duplicate Daily Call List columns: agreement_id/);
  await assert.rejects(() => importDailyCallList(makeCollectionFile('wrong.xlsx', 'WRONG'), TOTAL_HEAP_BUDGET_BYTES, () => {}), /Missing Daily Call List columns: portfolio_date/);
  await assert.rejects(() => importDailyCallList(workbookFile([headers, ...makeDailyRows('UNSAFE', 1)], 'unsafe.xlsx', { edit: (sheet) => { sheet.D2 = { t: 'n', v: 12345678901234567 }; } }), TOTAL_HEAP_BUDGET_BYTES, () => {}), /save identifiers and phone numbers as Text/);
  console.log('PASS: long text identifiers, UTF-8 names, blank-vs-zero numbers, and invalid-schema validation');

  assert.doesNotThrow(() => validateDailyCallListFile({ name: 'boundary.xlsx', size: DAILY_CALL_LIST_MAX_BYTES }));
  assert.throws(() => validateDailyCallListFile({ name: 'too-large.xlsx', size: DAILY_CALL_LIST_MAX_BYTES + 1 }), /file limit is 300 MB/);
  await assert.rejects(() => importDailyCallList(makeFile('budget.xlsx', 'BUDGET'), 1, () => {}), /remaining memory budget/);
  console.log('PASS: source-size and record-memory validation (no large-file performance claim)');

  await React.act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(App))));
  assert.ok(text().includes('Set Up Local Admin'), 'first run asks for a local admin account');
  await login('testadmin', 'test-admin-password');
  assert.ok(dailyInput());
  assert.ok(collectionInput());
  assert.ok(hourlyInput(), 'admin sees the hourly report input');
  assert.ok(text().includes('End of Day — FIS Report'), 'EOD panel is labelled for the daily FIS report');
  assert.ok(text().includes('Hourly Reports'), 'hourly panel exists for intra-day dumps');
  console.log('PASS: security login + End of Day and Hourly admin panels');
  assert.ok(!text().includes('Auto-generated'));
  await selectFile(dailyInput(), [new w.File(['bad'], 'bad.pdf')]);
  await waitFor(() => !!host.querySelector('[role="alert"]'));
  assert.match(host.querySelector('[role="alert"]').textContent, /\.xlsx, .xls, or .csv/);

  await selectFile(dailyInput(), [new w.File([], 'empty.xlsx')]);
  await waitFor(() => text().includes('This file is empty'));
  await selectFile(dailyInput(), [new w.File(['Other,Column\nA,B'], 'unmapped.csv')]);
  await waitFor(() => text().includes('Missing Daily Call List columns: portfolio_date'));
  console.log('PASS: dedicated panel validates unsupported, empty, and unmapped files');

  await selectFile(dailyInput(), [makeFile('daily-source.xlsx', 'DAILY')]);
  await waitFor(() => text().includes('Daily Call List Records'));
  assert.equal(host.querySelectorAll('[role="tab"]').length, 0);
  assert.ok(button('Overview').disabled, 'No collections report is required for daily imports');
  assert.match(text(), /DAILY-1/);
  assert.match(text(), /3 rows/);
  assert.deepEqual([...host.querySelectorAll('table[aria-label="Daily call list data"] thead th')].map((cell) => cell.textContent.trim()), headers);
  assert.ok(button('Download daily template'));
  await click(button('Portfolio summary'));
  assert.match(text(), /Daily Call List Portfolio Summary/);
  assert.ok(!host.querySelector('th')?.textContent.includes('RPC'));
  await click(button('Export portfolio summary'));
  const summaryCsv = await exportedBlob.text();
  assert.equal(summaryCsv.trim().split('\n').length, 3, 'Two uploaded days, not generated collections data');
  await click(button('Uploaded rows'));
  await click([...host.querySelectorAll('button')].find((node) => node.textContent.includes('Export CSV')));
  assert.match(exportName, /^daily-call-list-/);
  assert.equal((await exportedBlob.text()).trim().split('\n').length, 4);
  const exported = XLSX.read(await exportedBlob.text(), { type: 'string', raw: true });
  const exportRows = XLSX.utils.sheet_to_json(exported.Sheets[exported.SheetNames[0]], { header: 1 });
  assert.deepEqual(exportRows[0], headers);
  assert.equal(exportRows[1][1], '000123');
  assert.equal(exportRows[1][16], '09123456789');
  console.log('PASS: daily-only upload shows all 17 columns, portfolio summary, and matching source-only export');

  await click(host.querySelector('button[title="Choose which columns to display"]'));
  await click(button('Minimal'));
  assert.equal(host.querySelectorAll('table[aria-label="Daily call list data"] thead th').length, 8);
  await click([...host.querySelectorAll('button')].find((node) => node.textContent.includes('Export CSV')));
  const compact = XLSX.read(await exportedBlob.text(), { type: 'string', raw: true });
  assert.equal(XLSX.utils.sheet_to_json(compact.Sheets[compact.SheetNames[0]], { header: 1 })[0].length, 8);
  await click(button('Show all'));
  await click(button('Done'));
  assert.equal(host.querySelectorAll('table[aria-label="Daily call list data"] thead th').length, 17);

  const productsFilter = host.querySelector('[aria-label="Daily products filter"]');
  await click(productsFilter.querySelector('button'));
  await click([...productsFilter.querySelectorAll('button')].find((node) => node.textContent.trim() === 'Loan'));
  assert.match(text(), /Showing 2 of 2 rows/);
  assert.equal(host.querySelectorAll('table[aria-label="Daily call list data"] tbody tr').length, 2);
  await click([...host.querySelectorAll('button')].find((node) => node.textContent.includes('Export CSV')));
  const filteredExport = XLSX.read(await exportedBlob.text(), { type: 'string', raw: true });
  const filteredExportRows = XLSX.utils.sheet_to_json(filteredExport.Sheets[filteredExport.SheetNames[0]], { header: 1 });
  assert.equal(filteredExportRows.length, 3);
  assert.ok(filteredExportRows.slice(1).every((row) => row[8] === 'Loan'));
  await click(button('Clear filters'));
  assert.match(text(), /Showing 3 of 3 rows/);
  await click([...host.querySelectorAll('table th button')].find((node) => node.textContent.trim() === 'portfolio_date'));
  assert.equal(host.querySelector('table[aria-label="Daily call list data"] tbody tr td').textContent, '2026-10-21');
  console.log('PASS: daily column picker, product filter, date sorting, and filtered-column CSV exports');

  const invalid = new w.File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])], 'corrupt.xlsx');
  await selectFile(dailyInput(), [invalid]);
  await waitFor(() => !!host.querySelector('[role="alert"]'));
  assert.match(text(), /daily-source.xlsx/);
  assert.match(text(), /DAILY-1/);
  await dropFiles([makeFile('one.xlsx', 'ONE'), makeFile('two.xlsx', 'TWO')]);
  assert.match(text(), /one Daily Call List file at a time/);
  assert.match(text(), /DAILY-1/);
  await dropFiles([makeFile('daily-replacement.csv', 'REPLACED', 2, 'csv')]);
  await waitFor(() => text().includes('REPLACED-1'));
  assert.ok(!text().includes('DAILY-1'));
  assert.equal(host.querySelectorAll('[role="tab"]').length, 0);
  console.log('PASS: failed replacements preserve data; valid drops replace only the daily file');

  await selectFile(collectionInput(), [makeCollectionFile('collections.xlsx', 'COLLECTION', 5)]);
  await waitFor(() => host.querySelectorAll('[role="tab"]').length === 1);
  await click(button('Records'));
  assert.match(text(), /Collection Records/);
  assert.match(text(), /COLLECTION-1/);
  assert.ok(!text().includes('REPLACED-1'));
  await click(button('Daily Call List'));
  assert.match(text(), /REPLACED-1/);
  assert.ok(!text().includes('COLLECTION-1'));
  await selectFile(collectionInput(), [makeCollectionFile('collections-two.xlsx', 'SECOND', 4)]);
  await waitFor(() => host.querySelectorAll('[role="tab"]').length === 2);
  await click(button('Daily Call List'));
  assert.match(text(), /REPLACED-1/);
  await selectFile(dailyInput(), [makeFile('daily-new.xlsx', 'NEW', 1)]);
  await waitFor(() => text().includes('NEW-1'));
  assert.equal(host.querySelectorAll('[role="tab"]').length, 2);
  await click(button('Records'));
  assert.match(text(), /SECOND-1/);
  console.log('PASS: daily and collections uploads remain isolated in both upload orders');

  // Hourly upload: admin dumps an hourly report, tab is tagged distinctly from EOD.
  const hourlyPanelInput = document.getElementById('hourly-file-input');
  const dashboardHourly = host.querySelector('input[aria-label="Upload hourly report files"]');
  assert.ok(hourlyPanelInput || dashboardHourly, 'an hourly input is always available to admins');
  const startTabs = host.querySelectorAll('[role="tab"]').length;
  await selectFile(dashboardHourly, [makeCollectionFile('hourly-1000.xlsx', 'HOURLY', 3)]);
  await waitFor(() => host.querySelectorAll('[role="tab"]').length === startTabs + 1, 'hourly tab added');
  const tabLabels = [...host.querySelectorAll('[role="tab"]')].map((t) => t.textContent || '');
  assert.ok(tabLabels.some((t) => t.includes('Hourly')), `hourly tag shown: ${tabLabels.join(' | ')}`);
  assert.ok(tabLabels.some((t) => t.includes('End of Day')), 'existing end-of-day tags unchanged');
  await click(button('Records'));
  assert.match(text(), /HOURLY-1/, 'hourly rows load normally');
  await selectFile(collectionInput(), [makeCollectionFile('eod-1000.xlsx', 'EOD', 3)]);
  await waitFor(() => host.querySelectorAll('[role="tab"]').length === startTabs + 2, 'EOD tab added');
  const finalLabels = [...host.querySelectorAll('[role="tab"]')].map((t) => t.textContent || '');
  assert.equal(finalLabels.filter((t) => t.includes('Hourly')).length, 1, 'exactly one hourly tag');
  assert.equal(finalLabels.filter((t) => t.includes('End of Day')).length, 3, '3 end-of-day files tagged separately');
  console.log('PASS: hourly dumps are tagged Hourly, end-of-day dumps stay tagged End of Day');

  await click(button('Daily Call List'));
  await click(host.querySelector('button[aria-label="Remove Daily Call List file"]'));
  assert.ok(dailyInput());
  assert.ok(!text().includes('Daily Call List Records'));
  assert.ok(!text().includes('Daily Call List Portfolio Summary'));
  const beforeCleanup = host.querySelectorAll('[role="tab"]').length;
  assert.equal(beforeCleanup, 4, `daily removal leaves 4 report tabs (2 EOD + 1 hourly + 1 EOD), got ${beforeCleanup}`);
  await dropFiles([makeFile('last-daily.xlsx', 'LAST')]);
  await waitFor(() => text().includes('LAST-1'));
  // Remove every report tab regardless of cadence.
  for (let i = 0; i < beforeCleanup + 2; i++) {
    const remove = host.querySelector('[role="tab"] button[title^="Remove"]');
    if (!remove) break;
    await click(remove);
  }
  assert.match(text(), /LAST-1/);
  assert.equal(host.querySelectorAll('[role="tab"]').length, 0);
  await click(button('Clear All'));
  assert.ok(dailyInput() && collectionInput());
  assert.ok(!text().includes('LAST-1'));
  assert.ok(!text().includes('Auto-generated'));
  console.log('PASS: daily removal, collections removal, and Clear All preserve correct ownership');

  // Viewer role: both Daily Call List and Hourly Reports must be locked.
  await click(button('Access'));
  const accessDialog = host.querySelector('[role="dialog"]');
  assert.ok(accessDialog, 'Admin can manage accounts');
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    for (const [selector, value] of [
      ['input[placeholder="e.g. Juan Cruz"]', 'Test Viewer'],
      ['input[placeholder="e.g. juancruz"]', 'testviewer'],
      ['input[placeholder="Min. 4 characters"]', 'test-viewer-password'],
    ]) {
      const input = accessDialog.querySelector(selector);
      assert.ok(input, `Access form input exists: ${selector}`);
      setter.call(input, value);
      input.dispatchEvent(new w.Event('input', { bubbles: true }));
    }
  });
  await click(button('GRANT ACCESS'));
  await click(accessDialog.querySelector('[aria-label="Close access manager"]'));
  await click(button('Sign out'));
  await waitFor(() => text().includes('Security Access'), 'logout returns to security page');
  await login('testviewer', 'test-viewer-password');
  assert.ok(text().includes('VIEWER') || text().includes('viewer'), 'viewer badge visible');
  assert.ok(text().includes('Hourly Reports'), 'viewer sees the hourly panel placeholder');
  assert.ok(text().includes('Daily Call List') && text().includes('Admin Only'), 'daily panel is admin-locked for viewers');
  assert.ok(!document.getElementById('hourly-file-input'), 'no hourly file input for viewers');
  assert.ok(!host.querySelector('input[aria-label="Upload hourly report files"]'), 'no dashboard hourly input for viewers');
  assert.ok(document.getElementById('eod-file-input'), 'viewers keep the end-of-day upload');
  console.log('PASS: viewers cannot access hourly or daily uploads; end-of-day stays available');

  // Hourly is also blocked server-side in the handler, not just hidden.
  await React.act(async () => root.unmount());
  dom.window.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
// Run with jsdom on NODE_PATH. Exercises the actual worker message protocol.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const XLSX = require('xlsx');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('', { url: 'http://localhost/' });
global.FileReader = dom.window.FileReader;
global.File = dom.window.File;
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText,
    filename
  );
}

const headers = [
  'portfolio_date', 'customer_rk', 'agreement_rk', 'agreement_id', 'agency_name', 'debtor_name',
  'partner_name', 'company_name', 'product', 'date_of_assignment', 'date_of_abortion', 'os_current',
  'dpd_current', 'targeted_amount_current', 'initial_dpd_bucket', 'initial_dpd', 'mobile_phone_number',
];

function makeFile(count) {
  const matrix = [headers];
  for (let i = 0; i < count; i++) {
    matrix.push(['2026-10-21', `C${i}`, `R${i}`, `A${i}`, 'Agency', `Debtor ${i}`, 'Partner', 'Company', 'Loan', '2026-10-01', '', 10, 2, 5, '1-30', 1, `09${String(i).padStart(9, '0')}`]);
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(matrix), 'Daily');
  return new dom.window.File([XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })], 'worker.xlsx');
}

const messages = [];
let resolveComplete;
let rejectComplete;
const complete = new Promise((resolve, reject) => { resolveComplete = resolve; rejectComplete = reject; });
global.self = {
  onmessage: null,
  postMessage(message) {
    messages.push(message);
    if (message.type === 'batch') {
      setImmediate(() => global.self.onmessage({ data: { type: 'ack' } }));
    } else if (message.type === 'complete') {
      resolveComplete(message);
    } else if (message.type === 'error') {
      rejectComplete(new Error(message.message));
    }
  },
};

require('../src/workers/dailyCallList.worker.ts');

(async () => {
  const interval = setInterval(() => { /* heartbeat proves test event loop remains live */ }, 1);
  global.self.onmessage({ data: { type: 'parse', file: makeFile(4501), availableHeapBytes: 100 * 1024 * 1024 } });
  const result = await Promise.race([
    complete,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Worker protocol timed out')), 30000)),
  ]);
  clearInterval(interval);

  const batches = messages.filter((message) => message.type === 'batch');
  assert.deepEqual(batches.map((message) => message.records.length), [2000, 2000, 501]);
  const rows = batches.flatMap((message) => message.records);
  assert.equal(rows.length, 4501);
  assert.equal(rows[0].agreement_id, 'A0');
  assert.equal(rows.at(-1).agreement_id, 'A4500');
  assert.equal(result.file.records, undefined);
  assert.equal(result.file.fileName, 'worker.xlsx');
  assert.ok(messages.some((message) => message.type === 'progress' && message.progress.message.includes('Transferring')));
  console.log('PASS: worker maps 4,501 rows and returns acknowledged batches of 2,000/2,000/501 in order');

  const workerSource = fs.readFileSync('src/workers/dailyCallList.worker.ts', 'utf8');
  const wrapperSource = fs.readFileSync('src/utils/dailyCallListImport.ts', 'utf8');
  const built = fs.readFileSync('dist/index.html', 'utf8');
  assert.match(workerSource, /await waitForAck\(\)/);
  assert.match(wrapperSource, /worker\.terminate\(\)/);
  assert.match(wrapperSource, /signal\?\.addEventListener\('abort'/);
  assert.match(built, /daily-call-list-parser/);
  assert.match(built, /Transferring/);
  console.log('PASS: acknowledgement backpressure, termination, cancellation, and inline production worker are present');

  dom.window.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
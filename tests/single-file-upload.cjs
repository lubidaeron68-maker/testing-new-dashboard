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
  File: w.File, FileReader: w.FileReader, DOMException: w.DOMException,
  localStorage: w.localStorage,
});
Object.defineProperty(global, 'navigator', { value: w.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
global.ResizeObserver = w.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
global.requestAnimationFrame = w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = w.cancelAnimationFrame = clearTimeout;
w.HTMLElement.prototype.getBoundingClientRect = function () {
  return { width: 700, height: 320, top: 0, left: 0, right: 700, bottom: 320, x: 0, y: 0, toJSON() {} };
};

for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText,
    filename,
  );
}
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('?worker&inline')) return class WorkerStub {};
  return originalLoad.call(this, request, parent, isMain);
};

const React = require('react');
const { createRoot } = require('react-dom/client');
const App = require('../src/App.tsx').default;

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

const host = document.getElementById('root');
const root = createRoot(host);
const act = React.act;
async function waitFor(predicate, label) {
  for (let i = 0; i < 250; i++) {
    if (predicate()) return;
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  }
  throw new Error(`Timed out: ${label}`);
}
async function setInput(selector, value) {
  const el = host.querySelector(selector);
  assert.ok(el, `Input ${selector} exists`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
}

async function click(node) {
  assert.ok(node, 'Expected button exists');
  await act(async () => node.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
}
const text = () => host.textContent;
const tabs = () => host.querySelectorAll('[role="tab"]');
const button = (label) => [...host.querySelectorAll('button')].find((node) => node.textContent.trim().includes(label));

async function selectFile(input, files) {
  assert.ok(input, 'Upload input exists');
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
  });
}

(async () => {
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(App))));
  assert.match(text(), /Set Up Local Admin/);

  const firstRun = host.querySelector('#sec-name');
  assert.ok(firstRun, 'First-run admin setup is shown without seeded accounts');
  await setInput('#sec-name', 'Test Admin');
  await setInput('#sec-user', 'testadmin');
  await setInput('#sec-pass', 'test-admin-password');
  const loginBtn = [...host.querySelectorAll('button')].find((node) => node.textContent.includes('CREATE ADMIN'));
  assert.ok(loginBtn, 'Admin setup button exists');
  await click(loginBtn);
  await waitFor(() => text().includes('End of Day'), 'EOD panel for admin');


  const hourlyInput = host.querySelector('#hourly-file-input');
  assert.ok(hourlyInput, 'Hourly input exists');
  await selectFile(hourlyInput, [makeCollectionFile('first-hourly.xlsx', 'HOURLY1', 3)]);
  await waitFor(() => tabs().length === 1, 'a tab appears after hourly upload');
  await waitFor(() => text().includes('Hourly') || text().includes('Hour'), 'Hourly badge appears');
  console.log('   DEBUG tab count:', tabs().length, '| text snippet:', text().slice(0, 700));
  console.log('   DEBUG tab count:', tabs().length, '| text snippet:', text().slice(0, 600));

  const eodInput = host.querySelector('input[aria-label="Upload end of day FIS report files"]');
  assert.ok(eodInput, 'EOD input exists');
  await selectFile(eodInput, [makeCollectionFile('second-eod.xlsx', 'EOD2', 4)]);
  await waitFor(() => tabs().length === 1 && text().includes('second-eod'), 'EOD replaces hourly');
  assert.equal(tabs().length, 1, 'Only one tab shown at a time');
  assert.ok(!text().includes('first-hourly'), 'Previous file removed');
  console.log('PASS: new upload replaces the previous report - only 1 active tab');

  const hourlyDashInput = host.querySelector('input[aria-label="Upload hourly report files"]');
  assert.ok(hourlyDashInput, 'Hourly dashboard input exists');
  await selectFile(hourlyDashInput, [makeCollectionFile('third-hourly.xlsx', 'HOURLY3', 2)]);
  await waitFor(() => tabs().length === 1 && text().includes('third-hourly'), 'hourly replaces eod');
  assert.equal(tabs().length, 1, 'Still one tab');
  assert.ok(!text().includes('second-eod'));
  console.log('PASS: switching between hourly and EOD also keeps a single active file');

  await selectFile(eodInput, [
    makeCollectionFile('batch-a.xlsx', 'BATCHA', 2),
    makeCollectionFile('batch-b.xlsx', 'BATCHB', 2),
  ]);
  await waitFor(() => tabs().length === 1 && text().includes('batch-b'), 'multi-drop keeps last');
  assert.equal(tabs().length, 1);
  assert.ok(!text().includes('batch-a'));
  console.log('PASS: dropping multiple files at once keeps only the most recent one');

  await click(button('Access'));
  const accessDialog = host.querySelector('[role="dialog"]');
  assert.ok(accessDialog, 'Admin can manage accounts');
  await setInput('[placeholder="e.g. Juan Cruz"]', 'Test Viewer');
  await setInput('[placeholder="e.g. juancruz"]', 'testviewer');
  await setInput('[placeholder="Min. 4 characters"]', 'test-viewer-password');
  await click(button('GRANT ACCESS'));
  await click(accessDialog.querySelector('[aria-label="Close access manager"]'));
  await click(button('Sign out'));
  await waitFor(() => text().includes('Security Access'), 'logged out');
  await setInput('#sec-user', 'testviewer');
  await setInput('#sec-pass', 'test-viewer-password');
  // Re-query the login button — the old reference is stale after re-render.
  const loginBtn2 = [...host.querySelectorAll('button')].find((node) => node.textContent.includes('UNLOCK'));
  assert.ok(loginBtn2, 'Login button exists on security page');
  await click(loginBtn2);
  await waitFor(() => text().includes('Dump EOD') || text().includes('End of'), 'viewer dashboard visible');

  assert.equal(host.querySelectorAll('#hourly-file-input').length, 0, 'Hourly upload hidden from viewers');
  assert.equal(text().includes('Hourly Reports'), false, 'Hourly panel hidden from viewers');
  assert.equal(text().includes('Admin Only'), false, 'No admin-only lock panel rendered');
  assert.equal(text().includes('SWITCH TO ADMIN ACCOUNT'), false, 'No switch-account buttons');
  assert.equal(text().includes('Access Control'), false, 'Access manager not exposed');

  const eodViewer = host.querySelector('#eod-file-input');
  assert.ok(eodViewer, 'EOD upload remains available to viewers');
  await selectFile(eodViewer, [makeCollectionFile('viewer-eod.xlsx', 'VIEWER', 3)]);
  await waitFor(() => tabs().length === 1 && text().includes('viewer-eod'), 'viewer can upload EOD');
  assert.equal(host.querySelectorAll('#hourly-file-input').length, 0, 'Still hidden after viewer upload');
  console.log('PASS: viewer sees no hourly panel, no lock cards, no access manager; EOD still works');

  await act(async () => root.unmount());
  dom.window.close();
  console.log('\nALL SINGLE-FILE AND VIEWER-VISIBILITY CHECKS PASSED');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

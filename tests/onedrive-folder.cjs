// Run with jsdom available on NODE_PATH: node tests/onedrive-folder.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const XLSX = require('xlsx');

const NodeFile = File;
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
});

function streamedFile(bytes, name, type) {
  const file = new w.File([bytes], name, type ? { type } : undefined);
  const nodeFile = new NodeFile([bytes], name, type ? { type } : undefined);
  Object.defineProperty(file, 'stream', { configurable: true, value: () => nodeFile.stream() });
  return file;
}
const w = dom.window;
Object.assign(global, {
  window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node,
  File: w.File, FileReader: w.FileReader, DOMException: w.DOMException,
  localStorage: w.localStorage, blob: w.Blob,
});
Object.defineProperty(global, 'navigator', { value: w.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
global.ResizeObserver = w.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
global.requestAnimationFrame = w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = w.cancelAnimationFrame = clearTimeout;
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
w.HTMLElement.prototype.getBoundingClientRect = function () {
  const height = this.classList.contains('recharts-legend-wrapper') ? 30 : 320;
  return { width: 700, height, top: 0, left: 0, right: 700, bottom: height, x: 0, y: 0, toJSON() {} };
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
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('?worker&inline')) return class WorkerStub {};
  return originalLoad.call(this, request, parent, isMain);
};

const React = require('react');
const { createRoot } = require('react-dom/client');
const { renderToStaticMarkup } = require('react-dom/server');
const folderUtils = require('../src/utils/onedriveFolder.ts');
const { OneDriveFolderCard } = require('../src/components/OneDriveFolderCard.tsx');
const App = require('../src/App.tsx').default;

function fakeHandle(name, initialNames = []) {
  const existing = new Set(initialNames);
  const writes = new Map();
  const files = new Map();
  return {
    kind: 'directory',
    name,
    writes,
    files,
    async queryPermission() { return 'granted'; },
    async requestPermission() { return 'granted'; },
    async getFileHandle(candidate, options) {
      if (!existing.has(candidate) && !options?.create) {
        throw new w.DOMException('The requested file was not found.', 'NotFoundError');
      }
      existing.add(candidate);
      files.set(candidate, true);
      return {
        kind: 'file',
        name: candidate,
        createWritable: async () => {
          let bytes = new Uint8Array(0);
          let aborted = false;
          return {
            async write(chunk) {
              if (aborted) throw new Error('writable aborted');
              let addition;
              if (typeof chunk === 'string') addition = new TextEncoder().encode(chunk);
              else if (chunk instanceof Uint8Array) addition = chunk;
              else if (chunk && typeof chunk.arrayBuffer === 'function') addition = new Uint8Array(await chunk.arrayBuffer());
              else addition = new Uint8Array(0);
              const merged = new Uint8Array(bytes.length + addition.length);
              merged.set(bytes, 0);
              merged.set(addition, bytes.length);
              bytes = merged;
            },
            async close() { writes.set(candidate, bytes); },
            async abort() { aborted = true; },
          };
        },
      };
    },
  };
}

(async () => {
  delete w.showDirectoryPicker;
  assert.equal(folderUtils.supportsOneDriveFolderSaving(), false, 'unsupported without the API');
  await assert.rejects(() => folderUtils.pickOneDriveFolder(), /Chrome or Edge/);
  const sanitized = folderUtils.sanitizeArchiveName('bad/name:?*." ');
  assert.equal(sanitized, 'bad_name___._');
  assert.ok(!/[/\\<>:"|?*]/.test(sanitized) && !/[. ]$/.test(sanitized));
  assert.equal(folderUtils.sanitizeArchiveName(''), 'daily-call-list.xlsx');
  const long = folderUtils.sanitizeArchiveName(`${'x'.repeat(220)}.xlsx`);
  assert.ok(long.length <= 180 && long.endsWith('.xlsx'));
  await folderUtils.rememberFolder(fakeHandle('x'));
  assert.equal(await folderUtils.loadRememberedFolder(), null, 'IndexedDB-unavailable fallback is safe');
  await folderUtils.forgetRememberedFolder();
  console.log('PASS: capability detection, path-independent naming, length limits, and storage fallback');

  const picked = fakeHandle('daily call list');
  w.showDirectoryPicker = async (options) => { assert.equal(options.mode, 'readwrite'); assert.equal(options.startIn, 'documents'); return picked; };
  assert.equal(folderUtils.supportsOneDriveFolderSaving(), true);
  assert.equal(await folderUtils.pickOneDriveFolder(), picked);
  assert.equal(await folderUtils.queryFolderPermission(picked), 'granted');
  console.log('PASS: folder picker uses write access and the Documents starting location');

  const now = new Date(2026, 9, 21, 22, 1, 10);
  const collisionDir = fakeHandle('daily call list', ['daily-report.xlsx']);
  const safeName = await folderUtils.availableArchiveName(collisionDir, 'daily-report.xlsx', now);
  assert.equal(safeName, 'daily-report_2026-10-21_22-01-10.xlsx');
  await collisionDir.getFileHandle(safeName, { create: true });
  const secondName = await folderUtils.availableArchiveName(collisionDir, 'daily-report.xlsx', now);
  assert.equal(secondName, 'daily-report_2026-10-21_22-01-10_2.xlsx');
  const original = streamedFile(new TextEncoder().encode('portfolio rows'), 'daily-report.xlsx');
  const written = await folderUtils.writeDailyFileToFolder(collisionDir, original, now);
  assert.equal(written.fileName, secondName, 'never overwrites an existing daily file');
  assert.equal(new TextDecoder().decode(collisionDir.writes.get(written.fileName)), 'portfolio rows');
  console.log('PASS: collision-safe writes preserve both files and copy original bytes');

  const base = {
    supported: true, loading: false, folderName: null, permission: 'unknown',
    saveState: { status: 'idle' }, isSaving: false, canRetry: false,
    chooseFolder() {}, forgetFolder() {}, reconnect() {}, retrySave() {}, archive: async () => ({ status: 'idle' }),
  };
  const html = (controller) => renderToStaticMarkup(React.createElement(OneDriveFolderCard, { folder: controller }));
  assert.match(html({ ...base, supported: false }), /cannot write to a local folder/);
  assert.match(html(base), /OneDrive - OLP/);
  assert.match(html(base), /Choose OneDrive folder/);
  assert.match(html({ ...base, folderName: 'daily call list', permission: 'granted' }), /Automatic saving is on/);
  assert.match(html({ ...base, folderName: 'daily call list', permission: 'prompt' }), /Allow access/);
  assert.match(html({ ...base, folderName: 'daily call list', permission: 'granted', saveState: { status: 'saved', fileName: 'daily-report.xlsx', savedAt: '10:31:02 PM' } }), /Saved as daily-report.xlsx/);
  assert.match(html({ ...base, folderName: 'daily call list', permission: 'granted', canRetry: true, saveState: { status: 'error', message: 'Disk full' } }), /Retry save/);
  assert.match(html({ ...base, folderName: 'daily call list', permission: 'prompt', saveState: { status: 'needs-permission' } }), /Allow and retry/);
  console.log('PASS: connection card explains setup and provides choose, reconnect, retry, and disconnect states');

  // Real app integration: choose the folder once, then dump a daily file.
  const appFolder = fakeHandle('daily call list');
  w.showDirectoryPicker = async () => appFolder;
  let blob;
  let downloadName;
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { downloadName = this.download; };

  const host = document.getElementById('root');
  const root = createRoot(host);
  const act = React.act;
  const clickText = async (label) => {
    const button = [...host.querySelectorAll('button')].find((node) => node.textContent.trim() === label);
    assert.ok(button, `Expected button "${label}"`);
    await act(async () => button.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
  };
  const dailyInput = () => host.querySelector('input[aria-label="Upload Daily Call List file"]');

  const dailyHeaders = ['portfolio_date', 'customer_rk', 'agreement_rk', 'agreement_id', 'agency_name', 'debtor_name', 'partner_name', 'company_name', 'product', 'date_of_assignment', 'date_of_abortion', 'os_current', 'dpd_current', 'targeted_amount_current', 'initial_dpd_bucket', 'initial_dpd', 'mobile_phone_number'];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    dailyHeaders,
    ['2026-10-21', '000123', 'R1', 'AG-0001', 'Agency A', 'Renée Cruz', 'Partner', 'Client A', 'Loan', '2026-10-01', '', 2500.75, 10, 500.5, '1-30', 5, '09123456789'],
    ['2026-10-22', '000124', 'R2', 'AG-0002', 'Agency B', 'Person B', 'Partner', 'Client B', 'Card', '2026-10-02', '', 100, 3, 20, '1-30', 2, '09123456780'],
  ]), 'Daily');
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  const file = streamedFile(bytes, 'daily call list Oct 21.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  const waitFor = async (predicate, label) => {
    for (let i = 0; i < 300; i++) {
      if (predicate()) return;
      await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    }
    throw new Error(`Timed out: ${label}. Screen: ${host.textContent.slice(0, 500)}`);
  };

  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(App))));
  // The first browser account is created through the setup form.
  const valueSetter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  const secName = host.querySelector('#sec-name');
  const secUser = host.querySelector('#sec-user');
  const secPass = host.querySelector('#sec-pass');
  assert.ok(secName && secUser && secPass, 'First-run admin setup is rendered');
  await act(async () => {
    valueSetter.call(secName, 'Test Admin');
    secName.dispatchEvent(new w.Event('input', { bubbles: true }));
    valueSetter.call(secUser, 'testadmin');
    secUser.dispatchEvent(new w.Event('input', { bubbles: true }));
    valueSetter.call(secPass, 'test-admin-password');
    secPass.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
  await clickText('CREATE ADMIN ACCOUNT');
  await waitFor(() => !!host.querySelector('input[aria-label="Upload Daily Call List file"]'), 'dashboard after login');
  await clickText('Choose OneDrive folder');
  await waitFor(() => host.textContent.includes('Automatic saving is on'), 'folder connection');

  await act(async () => {
    Object.defineProperty(dailyInput(), 'files', { configurable: true, value: [file] });
    dailyInput().dispatchEvent(new w.Event('change', { bubbles: true }));
  });
  await waitFor(() => host.textContent.includes('Daily Call List Records'), 'daily parse');
  await waitFor(() => appFolder.writes.size === 1, 'automatic file write');

  const [savedName, savedBytes] = [...appFolder.writes.entries()][0];
  assert.equal(savedName, 'daily call list Oct 21.xlsx');
  assert.equal(savedBytes.length, bytes.length);
  assert.deepEqual(Array.from(savedBytes.slice(0, 4)), Array.from(new Uint8Array(bytes).slice(0, 4)));
  await waitFor(() => host.textContent.includes('Saved as daily call list Oct 21.xlsx'), 'saved status');
  assert.match(host.textContent, /OneDrive will sync it/);
  console.log('PASS: app automatically copies the original dumped workbook into the selected OneDrive folder');

  // The already connected folder is reused for a second dump; collision-safe name.
  const second = streamedFile(bytes, 'daily call list Oct 21.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await act(async () => {
    Object.defineProperty(dailyInput(), 'files', { configurable: true, value: [second] });
    dailyInput().dispatchEvent(new w.Event('change', { bubbles: true }));
  });
  await waitFor(() => appFolder.writes.size === 2, 'second automatic write');
  const collidedName = [...appFolder.writes.keys()].find((name) => name !== savedName);
  assert.match(collidedName, /^daily call list Oct 21_.+\.xlsx$/);
  console.log('PASS: later dumps auto-save without another picker, avoiding overwrites');

  await act(async () => root.unmount());
  dom.window.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

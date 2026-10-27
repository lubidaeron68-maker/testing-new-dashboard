// Exercises the main-thread worker wrapper, including backpressure and abort.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('', { url: 'http://localhost/' });
global.File = dom.window.File;
global.DOMException = dom.window.DOMException;
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText,
    filename
  );
}

class FakeWorker {
  static mode = 'success';
  static latest;
  onmessage = null;
  onerror = null;
  onmessageerror = null;
  terminated = false;
  constructor() { FakeWorker.latest = this; }
  postMessage(message) {
    if (message.type === 'parse' && FakeWorker.mode === 'success') {
      setImmediate(() => this.onmessage({ data: { type: 'progress', progress: { stage: 'parsing', percent: 25, message: 'background decode' } } }));
      setImmediate(() => this.onmessage({ data: { type: 'batch', records: [{ id: 'one' }, { id: 'two' }] } }));
    } else if (message.type === 'ack' && FakeWorker.mode === 'success') {
      setImmediate(() => this.onmessage({ data: { type: 'complete', file: {
        id: 'daily-1', fileName: 'daily.xlsx', sourceBytes: 4, uploadedLabel: 'now', sheetName: 'Daily',
        companies: [], agencies: [], partners: [], products: [], portfolioDates: [], dpdBuckets: [], portfolioSummary: [], heapBytes: 100,
      } } }));
    }
  }
  terminate() { this.terminated = true; }
}

global.Worker = FakeWorker;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('?worker&inline')) return FakeWorker;
  return originalLoad.call(this, request, parent, isMain);
};

const { importDailyCallList } = require('../src/utils/dailyCallListImport.ts');

(async () => {
  const progress = [];
  const result = await importDailyCallList(new File(['xlsx'], 'daily.xlsx'), 1000, (value) => progress.push(value));
  assert.deepEqual(result.records.map((record) => record.id), ['one', 'two']);
  assert.ok(progress.some((value) => value.message === 'background decode'));
  assert.equal(FakeWorker.latest.terminated, true);
  console.log('PASS: wrapper collects batches, acknowledges them, and terminates worker after completion');

  FakeWorker.mode = 'hang';
  const controller = new AbortController();
  const pending = importDailyCallList(new File(['xlsx'], 'cancel.xlsx'), 1000, () => {}, controller.signal);
  controller.abort();
  await assert.rejects(pending, (error) => error.name === 'AbortError');
  assert.equal(FakeWorker.latest.terminated, true);
  console.log('PASS: cancellation terminates a busy worker and rejects with AbortError');

  delete global.Worker;
  dom.window.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
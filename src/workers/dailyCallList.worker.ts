import type { DailyCallListFile, DailyCallRecord, ParseProgress } from '../types';
import { importDailyCallListDirect } from '../utils/dailyCallListDirect';

// Keep worker-only types local so the DOM lib in tsconfig remains the single
// global environment for the rest of the app.
declare const self: {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
};
const BATCH_SIZE = 2000;
const acknowledgements: Array<() => void> = [];

self.onmessage = (event: MessageEvent<{ type: 'parse'; file: File; availableHeapBytes: number } | { type: 'ack' }>) => {
  if (event.data.type === 'ack') return acknowledgements.shift()?.();
  void parse(event.data.file, event.data.availableHeapBytes);
};

const waitForAck = () => new Promise<void>((resolve) => acknowledgements.push(resolve));
const progress = (value: ParseProgress) => self.postMessage({ type: 'progress', progress: value });

async function parse(file: File, availableHeapBytes: number) {
  try {
    const parsed = await importDailyCallListDirect(file, availableHeapBytes, (value) => {
      // Direct mode reports 100% when row mapping finishes; reserve the last
      // four percent for batched transfer back to the UI.
      if (value.stage !== 'done') progress(value);
    });
    const records = parsed.records;
    for (let start = 0; start < records.length; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, records.length);
      self.postMessage({ type: 'batch', records: records.slice(start, end) });
      await waitForAck();
      for (let index = start; index < end; index++) records[index] = undefined as unknown as DailyCallRecord;
      progress({ stage: 'mapping', percent: 96 + Math.round(end / records.length * 3), message: `Transferring ${end.toLocaleString()} of ${records.length.toLocaleString()} rows...`, rowCount: end });
    }
    const { records: released, ...metadata } = parsed;
    void released;
    self.postMessage({ type: 'complete', file: metadata satisfies Omit<DailyCallListFile, 'records'> });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'The background Daily Call List parser failed.' });
  }
}
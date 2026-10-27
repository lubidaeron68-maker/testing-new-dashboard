import type { DailyCallListFile, DailyCallRecord, ParseProgress } from '../types';
import DailyCallListWorker from '../workers/dailyCallList.worker?worker&inline';
import {
  DAILY_CALL_LIST_MAX_BYTES,
  importDailyCallListDirect,
  validateDailyCallListFile,
} from './dailyCallListDirect';

export { DAILY_CALL_LIST_MAX_BYTES, validateDailyCallListFile };

type WorkerResponse =
  | { type: 'progress'; progress: ParseProgress }
  | { type: 'batch'; records: DailyCallRecord[] }
  | { type: 'complete'; file: Omit<DailyCallListFile, 'records'> }
  | { type: 'error'; message: string };

/** Parse off the UI thread. Direct parsing remains as a tested fallback. */
export async function importDailyCallList(
  file: File,
  availableHeapBytes: number,
  onProgress: (progress: ParseProgress) => void,
  signal?: AbortSignal
): Promise<DailyCallListFile> {
  validateDailyCallListFile(file);
  if (signal?.aborted) throw new DOMException('Daily Call List import cancelled.', 'AbortError');
  if (typeof Worker === 'undefined') return importDailyCallListDirect(file, availableHeapBytes, onProgress);

  return new Promise<DailyCallListFile>((resolve, reject) => {
    const worker = new DailyCallListWorker({ name: 'daily-call-list-parser' });
    const records: DailyCallRecord[] = [];
    let settled = false;
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', abort); };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const abort = () => fail(new DOMException('Daily Call List import cancelled.', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (settled) return;
      const message = event.data;
      if (message.type === 'progress') return onProgress(message.progress);
      if (message.type === 'batch') {
        records.push(...message.records);
        worker.postMessage({ type: 'ack' });
        return;
      }
      if (message.type === 'error') return fail(new Error(message.message));
      settled = true;
      cleanup();
      resolve({ ...message.file, records });
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new Error('The background spreadsheet parser stopped. Your current data is unchanged. Close other tabs or split this Daily Call List into smaller files.'));
    };
    worker.onmessageerror = () => fail(new Error('The parsed rows could not be transferred back to the page. Try a smaller file.'));
    onProgress({ stage: 'reading', percent: 0, message: `Starting background parser for ${file.name}...` });
    worker.postMessage({ type: 'parse', file, availableHeapBytes });
  });
}
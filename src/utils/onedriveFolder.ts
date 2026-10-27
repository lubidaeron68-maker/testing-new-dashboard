/**
 * Optional "save to a local OneDrive-synced folder" integration.
 *
 * A hosted page cannot address `C:\Users\...` directly. Instead, the user
 * selects the OneDrive-synced folder once through the File System Access API;
 * the browser grants a handle that this module remembers in IndexedDB. Files
 * are then written into that folder and the OneDrive desktop client syncs them
 * to the cloud. Nothing is uploaded to a server by this app.
 */

export interface FileHandlePermissionLike {
  queryPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

export interface WritableLike {
  write(data: Blob | BufferSource | string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

export interface DailyFolderFileHandleLike {
  kind: 'file';
  name: string;
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableLike>;
}

export interface DailyFolderHandleLike extends FileHandlePermissionLike {
  kind: 'directory';
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<DailyFolderFileHandleLike>;
}

export interface DirectoryPickerWindow {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }) => Promise<DailyFolderHandleLike>;
}

const DB_NAME = 'fis-report-settings';
const DB_STORE = 'handles';
const FOLDER_KEY = 'daily-call-list-folder';

export function supportsOneDriveFolderSaving(): boolean {
  if (typeof window === 'undefined') return false;
  const picker = (window as unknown as DirectoryPickerWindow).showDirectoryPicker;
  return typeof picker === 'function' && window.isSecureContext !== false;
}

export async function pickOneDriveFolder(): Promise<DailyFolderHandleLike> {
  if (!supportsOneDriveFolderSaving()) {
    throw new Error('This browser cannot save directly to a local folder. Open Fis Report in Chrome or Edge on desktop, or move the file into OneDrive manually.');
  }
  const picker = (window as unknown as DirectoryPickerWindow).showDirectoryPicker!;
  try {
    return await picker({
      id: 'fis-report-daily-call-list',
      mode: 'readwrite',
      startIn: 'documents',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof DOMException && error.name === 'SecurityError') {
      throw new Error('Folder access was blocked by this embedded preview. Open Fis Report in its own browser tab, then choose the OneDrive folder.');
    }
    throw new Error(error instanceof Error ? error.message : 'The folder picker could not be opened.');
  }
}

export async function queryFolderPermission(handle: DailyFolderHandleLike): Promise<PermissionState> {
  if (typeof handle.queryPermission !== 'function') return 'prompt';
  try {
    return await handle.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'prompt';
  }
}

/** Must be called from a user gesture such as a Reconnect button. */
export async function requestFolderPermission(handle: DailyFolderHandleLike): Promise<PermissionState> {
  if (typeof handle.requestPermission !== 'function') return 'prompt';
  try {
    return await handle.requestPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

/** Windows/macOS forbidden filename characters plus control characters. */
export function sanitizeArchiveName(name: string): string {
  const cleaned = name
    .replace(/[/\\<>:"|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  const base = cleaned || 'daily-call-list.xlsx';
  if (base.length <= 180) return base;
  const extensionIndex = base.lastIndexOf('.');
  const extension = extensionIndex > 0 ? base.slice(extensionIndex).slice(0, 12) : '';
  return `${base.slice(0, 180 - extension.length)}${extension}`;
}

function timestampSuffix(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

async function fileExists(directory: DailyFolderHandleLike, name: string): Promise<boolean> {
  try {
    await directory.getFileHandle(name);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return false;
    // Some implementations use a plain error with name/message only.
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'NotFoundError') return false;
    throw error;
  }
}

/** Never overwrites: appends a timestamp and counter when the name is taken. */
export async function availableArchiveName(
  directory: DailyFolderHandleLike,
  requestedName: string,
  now = new Date()
): Promise<string> {
  const safe = sanitizeArchiveName(requestedName);
  if (!(await fileExists(directory, safe))) return safe;
  const extensionIndex = safe.lastIndexOf('.');
  const extension = extensionIndex > 0 ? safe.slice(extensionIndex) : '';
  const base = extension ? safe.slice(0, extensionIndex) : safe;
  let candidate = `${base}_${timestampSuffix(now)}${extension}`;
  let counter = 2;
  while (await fileExists(directory, candidate)) {
    candidate = `${base}_${timestampSuffix(now)}_${counter}${extension}`;
    counter++;
    if (counter > 50) {
      candidate = `${base}_${Date.now()}_${counter}${extension}`;
      break;
    }
  }
  return candidate;
}

export async function writeDailyFileToFolder(
  directory: DailyFolderHandleLike,
  file: File,
  now = new Date()
): Promise<{ fileName: string }> {
  const fileName = await availableArchiveName(directory, file.name, now);
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    if (typeof file.stream === 'function') {
      // Stream chunk-by-chunk so a large workbook is never duplicated in memory.
      const reader = file.stream().getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) await writable.write(value);
        }
      } finally {
        reader.releaseLock();
      }
      await writable.close();
    } else {
      await writable.write(file);
      await writable.close();
    }
    return { fileName };
  } catch (error) {
    try {
      await writable.abort?.();
    } catch {
      /* best-effort */
    }
    throw new Error(
      error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Write permission to the OneDrive folder was denied.'
        : 'The daily file could not be written to the selected folder.'
    );
  }
}

// ---------------------------------------------------------------------------
// Remembered directory handle (best-effort IndexedDB persistence).
// ---------------------------------------------------------------------------

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DB_STORE)) database.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function rememberFolder(handle: DailyFolderHandleLike): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(DB_STORE, 'readwrite');
      transaction.objectStore(DB_STORE).put(handle, FOLDER_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  database.close();
}

async function readRememberedFolder(): Promise<DailyFolderHandleLike | null> {
  const database = await openDatabase();
  if (!database) return null;
  const result = await new Promise<DailyFolderHandleLike | null>((resolve) => {
    try {
      const transaction = database.transaction(DB_STORE, 'readonly');
      const request = transaction.objectStore(DB_STORE).get(FOLDER_KEY);
      request.onsuccess = () => {
        const value = request.result as DailyFolderHandleLike | undefined;
        resolve(value && value.kind === 'directory' ? value : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  database.close();
  return result;
}

export async function loadRememberedFolder(): Promise<DailyFolderHandleLike | null> {
  try {
    return await readRememberedFolder();
  } catch {
    return null;
  }
}

export async function forgetRememberedFolder(): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(DB_STORE, 'readwrite');
      transaction.objectStore(DB_STORE).delete(FOLDER_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  database.close();
}

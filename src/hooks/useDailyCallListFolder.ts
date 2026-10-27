import { useCallback, useEffect, useRef, useState } from 'react';
import {
  forgetRememberedFolder,
  loadRememberedFolder,
  pickOneDriveFolder,
  queryFolderPermission,
  rememberFolder,
  requestFolderPermission,
  supportsOneDriveFolderSaving,
  writeDailyFileToFolder,
  type DailyFolderHandleLike,
} from '../utils/onedriveFolder';

export type FolderSaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'needs-permission'
  | 'no-folder'
  | 'unsupported';

export interface FolderSaveState {
  status: FolderSaveStatus;
  fileName?: string;
  savedAt?: string;
  message?: string;
}

export function useDailyCallListFolder() {
  const supported = supportsOneDriveFolderSaving();
  const [handle, setHandleState] = useState<DailyFolderHandleLike | null>(null);
  const handleRef = useRef<DailyFolderHandleLike | null>(null);
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [loading, setLoading] = useState(supported);
  const [saveState, setSaveState] = useState<FolderSaveState>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const lastFileRef = useRef<File | null>(null);

  const updateHandle = useCallback((next: DailyFolderHandleLike | null) => {
    handleRef.current = next;
    setHandleState(next);
  }, []);

  useEffect(() => {
    let active = true;
    if (!supported) {
      setLoading(false);
      return;
    }
    void (async () => {
      const remembered = await loadRememberedFolder();
      if (!active) return;
      if (remembered) {
        updateHandle(remembered);
        const state = await queryFolderPermission(remembered);
        if (active) setPermission(state);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supported, updateHandle]);

  const chooseFolder = useCallback(async () => {
    try {
      const selected = await pickOneDriveFolder();
      updateHandle(selected);
      let state = await queryFolderPermission(selected);
      if (state === 'prompt' && typeof selected.requestPermission === 'function') {
        state = await requestFolderPermission(selected);
      }
      setPermission(state);
      await rememberFolder(selected);
      setSaveState({ status: 'idle' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSaveState({
        status: 'error',
        message: error instanceof Error ? error.message : 'The OneDrive folder could not be connected.',
      });
    }
  }, [updateHandle]);

  const forgetFolder = useCallback(async () => {
    lastFileRef.current = null;
    updateHandle(null);
    setPermission('unknown');
    setSaveState({ status: 'idle' });
    await forgetRememberedFolder();
  }, [updateHandle]);

  /** Never throws: the caller's daily import must continue even if archiving fails. */
  const archive = useCallback(async (file: File): Promise<FolderSaveState> => {
    if (!supported) {
      const result: FolderSaveState = {
        status: 'unsupported',
        fileName: file.name,
        message: 'This browser cannot write to a local folder. Save the file into OneDrive manually.',
      };
      setSaveState(result);
      return result;
    }
    const selected = handleRef.current;
    if (!selected) {
      const result: FolderSaveState = {
        status: 'no-folder',
        fileName: file.name,
        message: 'Choose your OneDrive daily call list folder once to enable automatic saving.',
      };
      setSaveState(result);
      return result;
    }

    lastFileRef.current = file;
    setIsSaving(true);
    setSaveState({ status: 'saving', fileName: file.name });
    try {
      const state = await queryFolderPermission(selected);
      setPermission(state);
      if (state !== 'granted') {
        const result: FolderSaveState = {
          status: 'needs-permission',
          fileName: file.name,
          message: 'The folder is remembered, but the browser needs your permission again before it can save.',
        };
        setSaveState(result);
        return result;
      }

      const saved = await writeDailyFileToFolder(selected, file);
      lastFileRef.current = null;
      const result: FolderSaveState = {
        status: 'saved',
        fileName: saved.fileName,
        savedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
      };
      setSaveState(result);
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') setPermission('prompt');
      const result: FolderSaveState = {
        status: 'error',
        fileName: file.name,
        message: error instanceof Error ? error.message : 'The file could not be saved to the OneDrive folder.',
      };
      setSaveState(result);
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [supported]);

  /** Button handler: requests write access (user gesture) then retries a pending save. */
  const reconnect = useCallback(async () => {
    const selected = handleRef.current;
    if (!selected) return;
    const state = await requestFolderPermission(selected);
    setPermission(state);
    if (state !== 'granted') {
      setSaveState((previous) => ({
        ...previous,
        status: 'needs-permission',
        message: 'Folder access was not granted. Try again and choose "Allow" in the browser prompt.',
      }));
      return;
    }
    if (lastFileRef.current) await archive(lastFileRef.current);
    else setSaveState({ status: 'idle' });
  }, [archive]);

  const retrySave = useCallback(async () => {
    if (lastFileRef.current) await archive(lastFileRef.current);
  }, [archive]);

  return {
    supported,
    loading,
    folderName: handle?.name ?? null,
    permission,
    saveState,
    isSaving,
    canRetry: Boolean(lastFileRef.current) && (saveState.status === 'error' || saveState.status === 'needs-permission'),
    chooseFolder,
    forgetFolder,
    reconnect,
    retrySave,
    archive,
  };
}

export type DailyFolderController = ReturnType<typeof useDailyCallListFolder>;

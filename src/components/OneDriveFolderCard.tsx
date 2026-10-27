import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FolderCheck,
  FolderOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import type { DailyFolderController } from '../hooks/useDailyCallListFolder';
import { cn } from '../utils/cn';

interface OneDriveFolderCardProps {
  folder: DailyFolderController;
}

function permissionLabel(permission: DailyFolderController['permission']): string {
  switch (permission) {
    case 'granted':
      return 'Ready';
    case 'prompt':
      return 'Permission needed';
    case 'denied':
      return 'Blocked';
    default:
      return 'Checking';
  }
}

export function OneDriveFolderCard({ folder }: OneDriveFolderCardProps) {
  const {
    supported,
    loading,
    folderName,
    permission,
    saveState,
    isSaving,
    canRetry,
    chooseFolder,
    forgetFolder,
    reconnect,
    retrySave,
  } = folder;

  const needsPermission = folderName !== null && (permission === 'prompt' || permission === 'denied');
  const saveTone =
    saveState.status === 'saved'
      ? 'text-emerald-700 dark:text-emerald-300'
      : saveState.status === 'saving'
        ? 'text-cyan-700 dark:text-cyan-300'
        : 'text-amber-700 dark:text-amber-300';

  return (
    <section
      aria-label="OneDrive daily call list folder"
      className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950/70">
            <CloudUpload className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">OneDrive auto-upload</h4>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Copy every dumped Daily Call List into your synced OneDrive folder.
            </p>
          </div>
        </div>
        {folderName && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
              permission === 'granted'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            )}
          >
            {permission === 'granted' ? <FolderCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {permissionLabel(permission)}
          </span>
        )}
      </div>

      <p className="mt-3 rounded-lg bg-white/70 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
        Choose this folder once:{' '}
        <code className="break-all font-semibold text-cyan-800 dark:text-cyan-300">
          OneDrive - OLP › dialer dashboard fis report › daily call list
        </code>
        . The browser cannot type a Windows path for you. After you grant access, the OneDrive desktop app uploads
        each saved copy to the cloud.
      </p>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the remembered folder...
        </p>
      ) : !supported ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This browser cannot write to a local folder. Use Chrome or Edge on desktop, or move your daily file into
            OneDrive manually. Uploading and analysing the file still works normally.
          </p>
        </div>
      ) : !folderName ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void chooseFolder()}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              <FolderOpen className="h-4 w-4" />
              Choose OneDrive folder
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">One-time setup; no files are sent to this site.</span>
          </div>
          {saveState.status === 'error' && (
            <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{saveState.message}</span>
              {saveState.message?.includes('embedded preview') && (
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                  className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  Open in a new tab
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-white/80 px-3 py-2 dark:bg-slate-950/40">
            <FolderCheck className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100" title={folderName}>
                {folderName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {permission === 'granted'
                  ? 'Automatic saving is on.'
                  : 'Folder remembered. Reconnect to allow writes again.'}
              </p>
            </div>
            {needsPermission && (
              <button
                type="button"
                onClick={() => void reconnect()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Allow access
              </button>
            )}
            <button
              type="button"
              onClick={() => void chooseFolder()}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => void forgetFolder()}
              title="Disconnect the remembered folder"
              aria-label="Disconnect OneDrive folder"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>

          {(isSaving || saveState.status !== 'idle') && (
            <div aria-live="polite" className={cn('mt-2 flex flex-wrap items-center gap-2 text-xs', saveTone)}>
              {saveState.status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saveState.status === 'saved' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {saveState.status === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
              {saveState.status === 'needs-permission' && <ShieldCheck className="h-3.5 w-3.5" />}
              <span className="min-w-0 break-words">
                {saveState.status === 'saving' && `Saving ${saveState.fileName ?? 'daily file'} to OneDrive folder...`}
                {saveState.status === 'saved' &&
                  `Saved as ${saveState.fileName}${saveState.savedAt ? ` at ${saveState.savedAt}` : ''}. OneDrive will sync it.`}
                {saveState.status === 'error' && (saveState.message ?? 'The file could not be saved.')}
                {saveState.status === 'needs-permission' && (saveState.message ?? 'Folder permission is needed.')}
                {saveState.status === 'no-folder' && (saveState.message ?? 'Choose a folder to enable automatic saving.')}
              </span>
              {saveState.status === 'needs-permission' && (
                <button
                  type="button"
                  onClick={() => void reconnect()}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/60"
                >
                  <RefreshCw className="h-3 w-3" /> Allow and retry
                </button>
              )}
              {saveState.status === 'error' && canRetry && permission === 'granted' && (
                <button
                  type="button"
                  onClick={() => void retrySave()}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/60"
                >
                  <RefreshCw className="h-3 w-3" /> Retry save
                </button>
              )}
            </div>
          )}
        </>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        Folder access stays in your browser. The app does not send the file to a server; OneDrive desktop syncs the
        local copy. Browsers cannot pre-fill the Windows path, so selecting the folder once is required.
      </p>
    </section>
  );
}

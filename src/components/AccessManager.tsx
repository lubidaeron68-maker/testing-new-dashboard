import { useState } from 'react';
import { ShieldCheck, X, UserPlus, Trash2, Crown, Eye, Crown as CrownIcon } from 'lucide-react';
import type { AuthController } from '../hooks/useAuth';
import { normalizeUserId, type AppUser } from '../utils/auth';
import { cn } from '../utils/cn';

interface AccessManagerProps {
  auth: AuthController;
  onClose: () => void;
}

/** Admin-only modal: view accounts, grant access, remove users. */
export function AccessManager({ auth, onClose }: AccessManagerProps) {
  const { users, currentUser, addUser, removeUser, resetPassword } = auth;
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppUser['role']>('viewer');
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormOk(null);
    const result = addUser({ displayName: name, userId, password, role });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormOk(`${result.user.displayName} granted ${result.user.role} access.`);
    setName('');
    setUserId('');
    setPassword('');
    setRole('viewer');
  };

  const doReset = (target: string) => {
    const result = resetPassword(target, resetValue);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormOk(`Password updated for ${target}.`);
    setResetFor(null);
    setResetValue('');
  };

  const canRemove = (u: AppUser) => {
    if (!currentUser) return false;
    if (normalizeUserId(u.userId) === normalizeUserId(currentUser.userId)) return false;
    const admins = users.filter((x) => x.role === 'admin');
    if (u.role === 'admin' && admins.length <= 1) return false;
    return true;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manage access"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-400/25 bg-[#0b0618] shadow-[0_30px_120px_-20px_rgba(0,246,255,0.35)]">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0618]/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 shadow-lg shadow-fuchsia-500/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-wide text-white">Access Control</h2>
              <p className="text-xs text-slate-400">
                Signed in as <span className="font-bold text-cyan-200">{currentUser?.displayName}</span> — Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close access manager"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Users table */}
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="bg-white/[0.04] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">
              Accounts
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-black/30 text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Password</th>
                  <th className="px-4 py-2 text-right">Access</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const shown = reveal[u.userId];
                  return (
                    <tr key={u.userId} className="align-top">
                      <td className="px-4 py-2.5 font-bold text-slate-100">
                        {u.displayName}
                        {currentUser && normalizeUserId(u.userId) === normalizeUserId(currentUser.userId) && (
                          <span className="ml-2 rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-200">
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-cyan-200">{u.userId}</td>
                      <td className="px-4 py-2.5">
                        {resetFor === u.userId ? (
                          <span className="flex items-center gap-1.5">
                            <input
                              value={resetValue}
                              onChange={(e) => setResetValue(e.target.value)}
                              placeholder="New password"
                              className="w-28 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px] text-white outline-none focus:border-cyan-400"
                            />
                            <button
                              type="button"
                              onClick={() => doReset(u.userId)}
                              className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-black text-black hover:brightness-110"
                            >
                              SAVE
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetFor(null);
                                setResetValue('');
                              }}
                              className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-300">{shown ? u.password : '••••'}</span>
                            <button
                              type="button"
                              aria-label={shown ? `Hide password for ${u.displayName}` : `Show password for ${u.displayName}`}
                              onClick={() => setReveal((p) => ({ ...p, [u.userId]: !p[u.userId] }))}
                              className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetFor(u.userId);
                                setResetValue('');
                                setFormError(null);
                                setFormOk(null);
                              }}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 hover:bg-white/10 hover:text-white"
                            >
                              Reset
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                            u.role === 'admin'
                              ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-black'
                              : 'bg-white/10 text-slate-300'
                          )}
                        >
                          {u.role === 'admin' && <CrownIcon className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canRemove(u) ? (
                          <button
                            type="button"
                            onClick={() => removeUser(u.userId)}
                            title={`Remove ${u.displayName}`}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600" title="Protected account">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add user */}
          <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Grant new access</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juan Cruz"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/70"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">User ID</span>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. juancruz"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-sm font-semibold text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/70"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 4 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-sm font-semibold text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/70"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Access</span>
                <span className="grid grid-cols-2 gap-2">
                  {(['admin', 'viewer'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black uppercase tracking-wider transition',
                        role === r
                          ? r === 'admin'
                            ? 'border-amber-400/60 bg-gradient-to-r from-amber-400/25 to-fuchsia-500/25 text-amber-200'
                            : 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                          : 'border-white/10 text-slate-500 hover:border-white/25 hover:text-slate-200'
                      )}
                    >
                      {r === 'admin' && <Crown className="h-3.5 w-3.5" />}
                      {r}
                    </button>
                  ))}
                </span>
              </label>
            </div>
            {formError && (
              <p role="alert" className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                {formError}
              </p>
            )}
            {formOk && (
              <p role="status" className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                {formOk}
              </p>
            )}
            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-black tracking-widest text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110"
            >
              <UserPlus className="h-4 w-4" /> GRANT ACCESS
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Only <span className="font-bold text-amber-300">Admin</span> accounts can open the Daily Call List
              upload. Viewer accounts keep full access to collections tabs.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

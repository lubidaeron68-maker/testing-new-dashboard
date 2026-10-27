import { Lock, Crown, LogOut } from 'lucide-react';
import type { AppUser } from '../utils/auth';

interface RestrictedAccessProps {
  currentUser: AppUser | null;
  onSwitchAccount: () => void;
  title?: string;
}

/** Shown wherever Admin-only content (Daily Call List upload) is hidden from viewers. */
export function RestrictedAccess({ currentUser, onSwitchAccount, title = 'Daily Call List' }: RestrictedAccessProps) {
  return (
    <section
      aria-label={`${title} restricted to admins`}
      className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-slate-950 via-[#14091f] to-slate-950 p-8 text-center shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(360px 220px at 50% 0%, black, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(360px 220px at 50% 0%, black, transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-fuchsia-600 shadow-lg shadow-amber-500/30">
          <Lock className="h-7 w-7 text-black/80" />
        </div>
        <h3 className="mt-4 text-lg font-black tracking-wide text-white">
          {title} — <span className="bg-gradient-to-r from-amber-300 to-fuchsia-400 bg-clip-text text-transparent">Admin Only</span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          You are signed in as <span className="font-bold text-white">{currentUser?.displayName ?? 'Viewer'}</span>
          <span className="mx-1.5 inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-widest text-slate-300">
            {currentUser?.role ?? 'viewer'}
          </span>
          Only <span className="font-bold text-amber-200">Admin access</span> can view and use the Daily Call List
          upload. Collections tabs remain available.
        </p>
        <button
          type="button"
          onClick={onSwitchAccount}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500 px-4 py-2.5 text-sm font-black tracking-wide text-black shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110"
        >
          <Crown className="h-4 w-4" />
          SWITCH TO ADMIN ACCOUNT
        </button>
        <button
          type="button"
          onClick={onSwitchAccount}
          className="mt-2 flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-slate-500 transition hover:text-slate-200"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </section>
  );
}

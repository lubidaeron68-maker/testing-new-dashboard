import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface SecurityPageProps {
  needsSetup: boolean;
  onLogin: (userId: string, password: string) => { ok: true } | { ok: false; error: string };
  onSetupAdmin: (input: { displayName: string; userId: string; password: string }) =>
    | { ok: true }
    | { ok: false; error: string };
}

export function SecurityPage({ needsSetup, onLogin, onSetupAdmin }: SecurityPageProps) {
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const result = needsSetup
      ? onSetupAdmin({ displayName, userId, password })
      : onLogin(userId, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
  };


  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07020f] px-4 py-10">
      {/* Cyberpunk backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(600px 320px at 18% 12%, rgba(0,246,255,0.16), transparent 60%), radial-gradient(700px 380px at 85% 18%, rgba(255,43,214,0.16), transparent 60%), radial-gradient(800px 500px at 50% 110%, rgba(109,75,255,0.22), transparent 60%), linear-gradient(rgba(109,75,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(109,75,255,0.07) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, auto, 44px 44px, 44px 44px',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/70 to-transparent" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_30px_120px_-20px_rgba(0,246,255,0.25)] backdrop-blur-xl lg:grid-cols-[1.05fr_1fr]">
        {/* Left — brand panel */}
        <div className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-gradient-to-b from-[#0d0620] via-[#120826] to-[#1a0a24] p-8 lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,246,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,43,214,0.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(420px 420px at 30% 20%, black, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(420px 420px at 30% 20%, black, transparent 70%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-14 w-14 rounded-2xl" />
              <div>
                <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-300">0xAE // SYS.ONLINE</p>
                <h1 className="bg-gradient-to-r from-cyan-300 via-indigo-400 to-fuchsia-400 bg-clip-text text-3xl font-black tracking-wide text-transparent">
                  Fis Report
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              Secure dialer dashboard for collections analytics. Sign in to dump files and compare periods.
            </p>
          </div>

          <div className="relative flex items-center gap-2 font-mono text-[11px] tracking-widest text-slate-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            NODE//AE-01 — SECURE CHANNEL
          </div>
        </div>

        {/* Right — login card */}
        <div className="relative bg-slate-950/60 p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-12 w-12 rounded-2xl" />
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-300">0xAE // SYS.ONLINE</p>
              <p className="bg-gradient-to-r from-cyan-300 via-indigo-400 to-fuchsia-400 bg-clip-text text-2xl font-black tracking-wide text-transparent">
                Fis Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 shadow-lg shadow-fuchsia-500/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white">
                {needsSetup ? 'Set Up Local Admin' : 'Security Access'}
              </h2>
              <p className="text-xs text-slate-400">
                {needsSetup ? 'Create the first account for this browser' : 'Sign in to unlock the dashboard'}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" autoComplete="off">
            {needsSetup && (
              <div>
                <label htmlFor="sec-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Display Name
                </label>
                <input
                  id="sec-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
            )}
            <div>
              <label htmlFor="sec-user" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <User className="h-3.5 w-3.5" /> User ID
              </label>
              <input
                id="sec-user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
                autoFocus={!needsSetup}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>

            <div>
              <label htmlFor="sec-pass" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <div className="relative">
                <input
                  id="sec-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                  onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-11 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsOn && <p className="mt-1 text-[11px] font-semibold text-amber-300">Caps Lock is on</p>}
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-black tracking-widest text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 active:scale-[0.99]"
            >
              <KeyRound className="h-4 w-4 transition-transform group-hover:rotate-12" />
              {needsSetup ? 'CREATE ADMIN ACCOUNT' : 'UNLOCK DASHBOARD'}
            </button>
          </form>

        </div>
      </div>

      <p className="relative mt-6 text-center font-mono text-[11px] tracking-widest text-slate-600">
        FIS REPORT // LOCAL BROWSER ACCOUNTS — NOT PRODUCTION AUTHENTICATION
      </p>
    </div>
  );
}

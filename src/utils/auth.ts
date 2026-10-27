export type UserRole = 'admin' | 'viewer';

export interface AppUser {
  /** Unique login id, stored lowercase without spaces (e.g. "janedoe") */
  userId: string;
  /** Display name shown in the UI (e.g. "Aeron Lubid") */
  displayName: string;
  /** Demo-only plain password. In production this must be hashed server-side. */
  password: string;
  role: UserRole;
}

const USERS_KEY = 'fis-report-users-v1';
const SESSION_KEY = 'fis-report-session-v1';

/** Normalize any login input so "Jane Doe", "janedoe" and "JANEDOE" all match. */
export function normalizeUserId(input: string): string {
  return (input || '').trim().toLowerCase().replace(/\s+/g, '');
}

function isAppUser(value: unknown): value is AppUser {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === 'string' &&
    typeof v.displayName === 'string' &&
    typeof v.password === 'string' &&
    (v.role === 'admin' || v.role === 'viewer')
  );
}

export function loadUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAppUser) : [];
  } catch {
    return [];
  }
}

export function persistUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}

export function loadSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function persistSession(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Find a user by User ID or display Name (case/space insensitive). */
export function findUser(users: AppUser[], login: string): AppUser | null {
  const needle = normalizeUserId(login);
  if (!needle) return null;
  return (
    users.find(
      (u) => normalizeUserId(u.userId) === needle || normalizeUserId(u.displayName) === needle
    ) ?? null
  );
}

export function authenticate(
  users: AppUser[],
  login: string,
  password: string
): { ok: true; user: AppUser } | { ok: false; error: string } {
  if (!login.trim()) return { ok: false, error: 'Enter your User ID.' };
  if (!password) return { ok: false, error: 'Enter your password.' };
  const user = findUser(users, login);
  if (!user) return { ok: false, error: 'User ID not found. Check the ID and try again.' };
  if (user.password !== password) return { ok: false, error: 'Incorrect password. Try again.' };
  return { ok: true, user };
}

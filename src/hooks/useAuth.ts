import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  authenticate,
  loadSessionUserId,
  loadUsers,
  normalizeUserId,
  persistSession,
  persistUsers,
  type AppUser,
} from '../utils/auth';

export function useAuth() {
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => loadSessionUserId());

  // Keep storage in sync whenever the user list changes.
  useEffect(() => {
    persistUsers(users);
  }, [users]);

  const currentUser = useMemo(
    () => users.find((u) => normalizeUserId(u.userId) === normalizeUserId(currentUserId || '')) ?? null,
    [users, currentUserId]
  );

  const isAdmin = currentUser?.role === 'admin';

  const login = useCallback(
    (loginId: string, password: string) => {
      const result = authenticate(users, loginId, password);
      if (result.ok) {
        setCurrentUserId(result.user.userId);
        persistSession(result.user.userId);
      }
      return result;
    },
    [users]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    persistSession(null);
  }, []);

  const addUser = useCallback(
    (input: { displayName: string; userId: string; password: string; role: AppUser['role'] }) => {
      const userId = normalizeUserId(input.userId);
      const displayName = input.displayName.trim();
      if (!displayName) return { ok: false as const, error: 'Name is required.' };
      if (!userId) return { ok: false as const, error: 'User ID is required.' };
      if (!input.password) return { ok: false as const, error: 'Password is required.' };
      if (input.password.length < 4) return { ok: false as const, error: 'Password must be at least 4 characters.' };
      if (users.some((u) => normalizeUserId(u.userId) === userId)) {
        return { ok: false as const, error: 'That User ID is already taken.' };
      }
      const next: AppUser = { userId, displayName, password: input.password, role: input.role };
      setUsers((prev) => [...prev, next]);
      return { ok: true as const, user: next };
    },
    [users]
  );

  const setupAdmin = useCallback(
    (input: { displayName: string; userId: string; password: string }) => {
      if (users.length > 0) {
        return { ok: false as const, error: 'Admin setup is already complete.' };
      }
      const result = addUser({ ...input, role: 'admin' });
      if (!result.ok) return result;
      setCurrentUserId(result.user.userId);
      persistSession(result.user.userId);
      return result;
    },
    [addUser, users.length]
  );

  const removeUser = useCallback(
    (userId: string) => {
      const target = normalizeUserId(userId);
      // Never allow removing the last admin or yourself.
      const remaining = users.filter((u) => normalizeUserId(u.userId) !== target);
      if (remaining.length === users.length) return;
      if (!remaining.some((u) => u.role === 'admin')) return;
      if (currentUser && normalizeUserId(currentUser.userId) === target) return;
      setUsers(remaining);
    },
    [users, currentUser]
  );

  const resetPassword = useCallback(
    (userId: string, nextPassword: string) => {
      if (!nextPassword || nextPassword.length < 4) {
        return { ok: false as const, error: 'Password must be at least 4 characters.' };
      }
      const target = normalizeUserId(userId);
      setUsers((prev) =>
        prev.map((u) => (normalizeUserId(u.userId) === target ? { ...u, password: nextPassword } : u))
      );
      return { ok: true as const };
    },
    []
  );

  return { users, currentUser, isAdmin, login, logout, addUser, setupAdmin, removeUser, resetPassword };
}

export type AuthController = ReturnType<typeof useAuth>;

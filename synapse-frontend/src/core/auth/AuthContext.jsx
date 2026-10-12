import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { clearSession, loadSession, saveSession } from './storage';

/**
 * Auth contract (the login pages only need this):
 *
 *   const { login } = useAuth();
 *   login({ user: { id, name, role }, token });   // role: 'patient' | 'pharmacist'
 *
 * After login(), navigate to homePathForRole(user.role).
 * Everything else (guards, header name, logout) reads from this context.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  const login = useCallback(({ user, token = null }) => {
    const next = { user, token };
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.user),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

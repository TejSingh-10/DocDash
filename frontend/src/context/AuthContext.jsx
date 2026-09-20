import { createContext, useContext, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'hcd_token';
const STORAGE_KEY_USER  = 'hcd_user';

/**
 * Reads the persisted session from localStorage.
 * Returns { token, user } or { token: null, user: null } if nothing stored.
 */
function readStoredSession() {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const user  = JSON.parse(localStorage.getItem(STORAGE_KEY_USER) ?? 'null');
    return token && user ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  /**
   * Persist a successful auth result (login or register response).
   * Stores the JWT in localStorage for persistence across page reloads.
   */
  const login = useCallback((token, user) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    setSession({ token, user });
  }, []);

  /** Clear the session. */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setSession({ token: null, user: null });
  }, []);

  const value = {
    user:          session.user,
    token:         session.token,
    isAuthenticated: Boolean(session.token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the auth context value.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

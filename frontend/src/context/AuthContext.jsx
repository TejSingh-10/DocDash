import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'hcd_token';
const STORAGE_KEY_USER  = 'hcd_user';

function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY_TOKEN) ?? null;
  } catch {
    return null;
  }
}

function persistSession(token, user) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function clearPersistedSession() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

/**
 * Provides auth state to the entire app.
 *
 * On mount, if a JWT is found in localStorage, the provider calls GET /api/me
 * to verify the token is still valid (not expired, not revoked) and to fetch
 * fresh user data. During this check, `isLoading` is true — route guards must
 * suspend rendering until loading is complete to avoid a flash redirect to /login
 * for users with a valid stored session.
 *
 * Exposed context shape:
 *   user            — { id, email, role } | null
 *   role            — 'DOCTOR' | 'PATIENT' | 'ADMIN' | null (shorthand for user.role)
 *   token           — JWT string | null
 *   isAuthenticated — Boolean
 *   isLoading       — true while the stored token is being verified on app load
 *   login(token, user) — call after a successful login / register response
 *   logout()           — clears state and storage
 */
export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [token,     setToken]     = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until initial verification done

  // On mount: verify any stored token with the backend.
  useEffect(() => {
    const storedToken = readStoredToken();

    if (!storedToken) {
      // No token stored — skip the network call, not authenticated.
      setIsLoading(false);
      return;
    }

    api.me(storedToken)
      .then(({ user: freshUser }) => {
        // Token valid — restore the session with fresh user data.
        setToken(storedToken);
        setUser(freshUser);
        persistSession(storedToken, freshUser);
      })
      .catch(() => {
        // Token expired or invalid — clear stale data silently.
        clearPersistedSession();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []); // runs once on mount

  const login = useCallback((newToken, newUser) => {
    persistSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearPersistedSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    role:            user?.role ?? null,
    token,
    isAuthenticated: Boolean(token),
    isLoading,
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
 * Must be called inside a component that is a descendant of <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

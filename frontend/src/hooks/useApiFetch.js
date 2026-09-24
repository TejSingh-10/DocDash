import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * useApiFetch — generic data-fetching hook for authenticated API calls.
 *
 * @param {(token: string) => Promise<T>} fetcher  — function that calls api.*
 * @param {any[]} deps — extra dependencies that should re-trigger the fetch
 *
 * Returns { data, loading, error, refetch }
 *
 * - On mount (and whenever deps change), calls fetcher with the current token.
 * - On error: sets local `error` string AND fires a global toast notification.
 * - `refetch` allows manual refresh without changing deps.
 */
export function useApiFetch(fetcher, deps = []) {
  const { token } = useAuth();
  const toast = useToast();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [rev,     setRev]     = useState(0); // incremented by refetch()

  const refetch = useCallback(() => setRev((r) => r + 1), []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher(token)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err.message ?? 'Failed to load data.';
          setError(msg);
          setLoading(false);
          // Don't toast auth errors — those are handled by the auth flow
          if (err.status !== 401 && err.status !== 403) {
            toast.error(msg);
          }
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, rev, ...deps]);

  return { data, loading, error, refetch };
}

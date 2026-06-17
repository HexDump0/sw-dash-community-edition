import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getAuthToken, loginWithCurl, logout as apiLogout, getMe, setAuthToken, type ReviewerInfo } from './api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [reviewer, setReviewer] = useState<ReviewerInfo | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));
  const [error, setError] = useState<string | null>(null);

  const restore = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setReviewer(null);
      return;
    }
    try {
      const me = await getMe();
      setReviewer(me);
      setError(null);
    } catch {
      setReviewer(null);
      setAuthToken(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    if (!token) {
      return;
    }
    getMe()
      .then((me) => {
        if (!active) return;
        setReviewer(me);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setReviewer(null);
        setAuthToken(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'stardance.authToken') {
        restore();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [restore]);

  const login = useCallback(async (curl: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await loginWithCurl(curl);
      setAuthToken(resp.token);
      setReviewer(resp.reviewer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiLogout();
    } finally {
      setAuthToken(null);
      setReviewer(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ reviewer, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

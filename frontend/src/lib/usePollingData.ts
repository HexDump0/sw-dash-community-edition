import { useCallback, useEffect, useState } from 'react';

interface UsePollingDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePollingData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  intervalMs: number
): UsePollingDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetcher()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetcher]);

  useEffect(() => {
    // This effect fetches async data on mount/deps change and polls it.
    // The synchronous setLoading is intentional: it shows a loading state
    // while the first request is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh };
}

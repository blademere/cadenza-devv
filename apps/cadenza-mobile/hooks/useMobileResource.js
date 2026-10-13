import { useCallback, useEffect, useState } from 'react';
import { isMockDataEnabled } from '../services/dataMode';

export default function useMobileResource(loadResource) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mockMode = await isMockDataEnabled();
      const result = await loadResource();
      setData(result);
      setIsMock(mockMode);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Unable to load this information.',
      );
    } finally {
      setLoading(false);
    }
  }, [loadResource]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, isMock, refresh };
}

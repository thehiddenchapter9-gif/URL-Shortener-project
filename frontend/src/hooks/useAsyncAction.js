import { useCallback, useState } from 'react';

/**
 * Encapsulates the loading / error / data lifecycle for a single async
 * action (e.g. an API call triggered by a form submit), so components
 * don't each reimplement the same three `useState` calls and try/catch.
 *
 * @param {(...args: any[]) => Promise<any>} action
 */
export function useAsyncAction(action) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError('');
      setData(null);
      try {
        const result = await action(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err.message || 'Что-то пошло не так');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [action]
  );

  const reset = useCallback(() => {
    setError('');
    setData(null);
  }, []);

  return { run, loading, error, data, reset };
}

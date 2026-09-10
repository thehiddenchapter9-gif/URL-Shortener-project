import { useState } from 'react';
import { fetchStats } from '../api';
import { useAsyncAction } from '../hooks/useAsyncAction';

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

export default function StatsLookup() {
  const [shortCode, setShortCode] = useState('');
  const [formError, setFormError] = useState('');
  const { run, loading, error, data: stats } = useAsyncAction(fetchStats);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = shortCode.trim();

    if (!trimmed) {
      setFormError('Введите короткий код');
      return;
    }

    setFormError('');
    await run(trimmed);
  }

  return (
    <section className="card">
      <h2>Статистика</h2>
      <form onSubmit={handleSubmit} className="form-row">
        <input
          type="text"
          placeholder="abc123"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
          aria-label="Короткий код"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Загружаем…' : 'Получить статистику'}
        </button>
      </form>

      {(formError || error) && (
        <p className="message message-error" role="alert">
          {formError || error}
        </p>
      )}

      {stats && (
        <dl className="stats">
          <dt>Оригинальный URL</dt>
          <dd>
            <a href={stats.originalUrl} target="_blank" rel="noopener noreferrer">
              {stats.originalUrl}
            </a>
          </dd>
          <dt>Переходы</dt>
          <dd>{stats.clicks}</dd>
          <dt>Создана</dt>
          <dd>{formatDate(stats.createdAt)}</dd>
        </dl>
      )}
    </section>
  );
}

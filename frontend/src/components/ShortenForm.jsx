import { useState } from 'react';
import { shortenUrl } from '../api';
import { useAsyncAction } from '../hooks/useAsyncAction';

export default function ShortenForm() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const { run, loading, error, data: result } = useAsyncAction(shortenUrl);

  function handleChange(event) {
    setOriginalUrl(event.target.value);
    setCopied(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = originalUrl.trim();

    if (!trimmed) {
      setFormError('Введите ссылку');
      return;
    }

    setFormError('');
    await run(trimmed);
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the
      // link is still visible and clickable, so this is non-fatal.
      setCopied(false);
    }
  }

  return (
    <section className="card">
      <h2>Сократить ссылку</h2>
      <form onSubmit={handleSubmit} className="form-row">
        <input
          type="text"
          placeholder="https://example.com/very/long/path"
          value={originalUrl}
          onChange={handleChange}
          aria-label="Оригинальный URL"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Сокращаем…' : 'Сократить'}
        </button>
      </form>

      {(formError || error) && (
        <p className="message message-error" role="alert">
          {formError || error}
        </p>
      )}

      {result && (
        <div className="result">
          <a href={result.shortUrl} target="_blank" rel="noopener noreferrer">
            {result.shortUrl}
          </a>
          <button type="button" className="secondary" onClick={handleCopy}>
            {copied ? 'Скопировано ✓' : 'Копировать в буфер обмена'}
          </button>
        </div>
      )}
    </section>
  );
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    return data.error || `Ошибка запроса (${response.status})`;
  } catch {
    return `Ошибка запроса (${response.status})`;
  }
}

export async function shortenUrl(originalUrl) {
  const response = await fetch(`${API_BASE_URL}/api/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

export async function fetchStats(shortCode) {
  const response = await fetch(`${API_BASE_URL}/api/stats/${encodeURIComponent(shortCode)}`);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
}

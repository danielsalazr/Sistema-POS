import { clearSession, session } from './session.js';

const baseUrl = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-compania-id': String(session.compania?.idCompania || 1),
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/login') {
      clearSession();
      const { default: router } = await import('./router.js');
      const current = router.currentRoute.value;
      if (current.name !== 'login') router.push({ name: 'login', query: { redirect: current.fullPath } });
    }
    const error = new Error(payload.error || `Error HTTP ${response.status}`);
    Object.assign(error, payload);
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function downloadFile(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    headers: session.token ? { Authorization: `Bearer ${session.token}` } : {}
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Error HTTP ${response.status}`);
  }
  const disposition = response.headers.get('Content-Disposition') || '';
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] || 'descarga';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
};

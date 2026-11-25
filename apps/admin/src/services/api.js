const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api/v1';
const apiUrl = new URL(configuredApiBase, window.location.href);
const localApi = ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname);
const localDevPage = window.location.protocol === 'http:' && ['5173', '5174'].includes(window.location.port) && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
if (localApi && localDevPage) apiUrl.hostname = window.location.hostname;
export const API_BASE_URL = apiUrl.toString().replace(/\/$/, '');

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || 'The request could not be completed.');
  return body.data;
}

export const getDashboardSummary = () => api('/dashboard/summary');

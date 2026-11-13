import { writable } from 'svelte/store';

const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export const auth = writable(null); // { token, user }

export function initAuth() {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      auth.set(parsed);
      return parsed;
    } catch { /* ignore */ }
  }
  return null;
}

export function setAuth(token, user) {
  const value = { token, user };
  localStorage.setItem('auth', JSON.stringify(value));
  auth.set(value);
}

export function clearAuth() {
  localStorage.removeItem('auth');
  auth.set(null);
}

export function getToken() {
  let t = null;
  auth.subscribe(v => { t = v?.token; })();
  return t;
}

export async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
      location.href = '/';
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

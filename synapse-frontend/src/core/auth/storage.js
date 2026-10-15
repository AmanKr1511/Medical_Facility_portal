const KEY = 'synapse.auth';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Used by the API client to attach credentials. */
export function getAuthToken() {
  return loadSession()?.token ?? null;
}

export function getRefreshToken() {
  return loadSession()?.refreshToken ?? null;
}

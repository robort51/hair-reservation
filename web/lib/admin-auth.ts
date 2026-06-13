const ADMIN_TOKEN_KEY = 'yjmf_admin_token';

export function getAdminToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export function redirectToAdminLogin() {
  if (typeof window === 'undefined') {
    return;
  }
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
}

const ACCESS_TOKEN_KEY = 'dermahealth:v1:auth:accessToken';
const EXPIRES_AT_KEY = 'dermahealth:v1:auth:accessTokenExpiresAt';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAccessTokenExpiresAt(): string | null {
  try {
    return localStorage.getItem(EXPIRES_AT_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string, expiresAt: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
  } catch {
    // ignore — private mode / storage disabled
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  } catch {
    // ignore
  }
}

export function isAccessTokenExpired(): boolean {
  const expiresAt = getAccessTokenExpiresAt();
  if (!expiresAt) return true;
  return Date.parse(expiresAt) <= Date.now();
}

let accessToken: string | null = null;
let accessTokenExpiresAt: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAccessTokenExpiresAt(): string | null {
  return accessTokenExpiresAt;
}

export function setAccessToken(token: string, expiresAt: string): void {
  accessToken = token;
  accessTokenExpiresAt = expiresAt;
}

export function clearAccessToken(): void {
  accessToken = null;
  accessTokenExpiresAt = null;
}

export function isAccessTokenExpired(): boolean {
  const expiresAt = getAccessTokenExpiresAt();
  if (!expiresAt) return true;
  return Date.parse(expiresAt) <= Date.now();
}

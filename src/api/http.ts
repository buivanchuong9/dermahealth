import {
  clearAccessToken,
  getAccessToken,
  isAccessTokenExpired,
  setAccessToken,
} from "./authToken";
import type { AuthSession } from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "";

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  retryAuth?: boolean;
  idempotencyKey?: string;
}

const SESSION_REFRESH_ENDPOINT = "/api/v1/auth/session-refreshes";
let refreshPromise: Promise<string> | null = null;
let redirectingToLogin = false;

function redirectToLoginAfterSessionExpiry(): void {
  if (typeof window === "undefined" || redirectingToLogin) return;
  if (window.location.pathname === "/login") return;
  redirectingToLogin = true;
  try {
    sessionStorage.setItem(
      "dermahealth:returnTo",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  } catch {
    // Session storage may be unavailable in private/restricted browsing.
  }
  window.location.replace("/login?reason=session-expired");
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = request<AuthSession>(SESSION_REFRESH_ENDPOINT, {
      method: "POST",
      auth: false,
    })
      .then((session) => {
        setAccessToken(session.accessToken, session.accessTokenExpiresAt);
        return session.accessToken;
      })
      .catch((error) => {
        clearAccessToken();
        if (error instanceof ApiError && error.status === 401) {
          redirectToLoginAfterSessionExpiry();
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    auth = true,
    retryAuth = true,
    idempotencyKey,
  }: RequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  const requestIdempotencyKey =
    method === "GET" ? undefined : (idempotencyKey ?? crypto.randomUUID());
  if (requestIdempotencyKey) {
    headers["Idempotency-Key"] = requestIdempotencyKey;
  }
  if (auth) {
    let token = getAccessToken();
    if (!token || isAccessTokenExpired()) {
      token = await refreshAccessToken();
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retryAuth) {
    clearAccessToken();
    await refreshAccessToken();
    return request<T>(path, {
      method,
      body,
      auth,
      retryAuth: false,
      idempotencyKey: requestIdempotencyKey,
    });
  }

  if (res.status === 401 && auth) {
    clearAccessToken();
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message =
      json?.message ??
      json?.error?.message ??
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, json?.requestId);
  }

  if (json && typeof json === "object" && "data" in json && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...options, method: "DELETE", body }),
};

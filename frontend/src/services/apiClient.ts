export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  title: string;
  detail: string;
  fieldErrors?: Record<string, string>;

  constructor(status: number, title: string, detail: string, fieldErrors?: Record<string, string>) {
    super(detail || title);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function registerUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedCallback = handler;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const idx = cookie.indexOf('=');
    if (idx > 0) {
      const key = cookie.slice(0, idx);
      if (key === name) {
        return decodeURIComponent(cookie.slice(idx + 1));
      }
    }
  }
  return null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCookie('XSRF-TOKEN');
  if (existing) return existing;

  await fetch('/api/v1/auth/csrf', {
    method: 'GET',
    credentials: 'include',
  });
  return readCookie('XSRF-TOKEN');
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const body = (await response.json()) as ProblemDetail;
      return new ApiError(
        response.status,
        body.title || `Error ${response.status}`,
        body.detail || 'No pudimos procesar la solicitud.',
        body.errors
      );
    }
  } catch {
    // Ignore JSON parse failure
  }
  return new ApiError(
    response.status,
    `Error ${response.status}`,
    response.statusText || 'Error de comunicación con el servidor.'
  );
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const csrf = await ensureCsrfToken();
      const headers = new Headers();
      if (csrf) {
        headers.set('X-XSRF-TOKEN', csrf);
      }

      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const data = (await res.json()) as { accessToken?: string };
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function logoutSession(): Promise<void> {
  try {
    const csrf = await ensureCsrfToken();
    const headers = new Headers();
    if (csrf) {
      headers.set('X-XSRF-TOKEN', csrf);
    }
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } finally {
    setAccessToken(null);
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
  csrf?: boolean;
  skipRefreshRetry?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, csrf = false, skipRefreshRetry = false, headers: customHeaders, ...init } = options;
  const headers = new Headers(customHeaders);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth && inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  if (csrf) {
    const xsrf = await ensureCsrfToken();
    if (xsrf) {
      headers.set('X-XSRF-TOKEN', xsrf);
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && auth && !skipRefreshRetry) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return apiRequest<T>(path, { ...options, skipRefreshRetry: true });
    }
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}/cadenza-client`;

let accessToken = null;
let csrfToken = null;
let refreshHandler = null;
let csrfRequestPromise = null;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_ENDPOINT = '/auth/csrf';
const REFRESH_ENDPOINT = '/auth/refresh';

const getCookie = (name) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split('; ')
    .find((value) => value.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return null;
  }
};

const getCsrfToken = () => {
  // Prefer the in-memory token. The API is hosted on another domain,
  // so its cookie may not be readable by the frontend.
  const cookieToken = getCookie(CSRF_COOKIE_NAME);

  if (cookieToken) {
    csrfToken = cookieToken;
  }

  return csrfToken;
};

const setCsrfToken = (token) => {
  csrfToken =
    typeof token === 'string' && token.trim().length > 0
      ? token
      : null;

  return csrfToken;
};

const createIdempotencyKey = () => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isFormData = (body) => {
  return typeof FormData !== 'undefined' && body instanceof FormData;
};

const normalizeMethod = (method = 'GET') => method.toUpperCase();

const parseResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const createApiError = (payload, status, fallbackMessage) => {
  const error = new Error(payload?.message ?? fallbackMessage);
  error.status = status;
  error.errors = payload?.errors ?? [];
  return error;
};

const extractData = (payload) => payload?.data ?? payload;

const isRefreshRequest = (path) =>
  path.replace(/\/+$/, '').endsWith(REFRESH_ENDPOINT);

const isCsrfRequest = (path) =>
  path.replace(/\/+$/, '').endsWith(CSRF_ENDPOINT);

const shouldRefresh = (response, path, allowRefresh) =>
  response.status === 401 &&
  allowRefresh &&
  typeof refreshHandler === 'function' &&
  !isRefreshRequest(path) &&
  !isCsrfRequest(path);

/**
 * Fetch a CSRF token from the API before any unsafe request, including refresh.
 * The backend must set the csrfToken cookie and return { csrfToken } in JSON.
 */
const ensureCsrfToken = async ({ force = false } = {}) => {
  if (!force && getCsrfToken()) {
    return csrfToken;
  }

  if (csrfRequestPromise) {
    return csrfRequestPromise;
  }

  csrfRequestPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}${CSRF_ENDPOINT}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw createApiError(
        payload,
        response.status,
        'Failed to obtain a CSRF token.',
      );
    }

    const token = extractData(payload)?.csrfToken;

    if (typeof token !== 'string' || !token.trim()) {
      throw new Error(
        'The CSRF endpoint did not return a csrfToken. Check the backend response.',
      );
    }

    setCsrfToken(token);
    return token;
  })();

  try {
    return await csrfRequestPromise;
  } finally {
    csrfRequestPromise = null;
  }
};

const addRequestHeaders = (options = {}, tokenOverride = null) => {
  const method = normalizeMethod(options.method);
  const headers = new Headers(options.headers);
  const body = options.body;

  if (
    body !== undefined &&
    body !== null &&
    !isFormData(body) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!SAFE_METHODS.has(method)) {
    const token = tokenOverride ?? getCsrfToken();

    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    } else {
      headers.delete(CSRF_HEADER_NAME);
    }
  }

  return { method, headers, body };
};

const request = async (path, options = {}, allowRefresh = true) => {
  const method = normalizeMethod(options.method);
  let tokenOverride = null;

  // Refresh is also protected by csrfProtection in auth.routes.js, so it
  // must bootstrap a token just like every other unsafe request.
  if (!SAFE_METHODS.has(method) && !isCsrfRequest(path)) {
    tokenOverride = await ensureCsrfToken();
  }

  const { headers, body } = addRequestHeaders(options, tokenOverride);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (shouldRefresh(response, path, allowRefresh)) {
      const refreshed = await refreshHandler();

      if (refreshed) {
        return request(path, options, false);
      }
    }

    const isCsrfError =
      response.status === 400 &&
      /csrf token (is missing|is invalid)|csrf/i.test(
        payload?.message ?? '',
      );

    // Retry one time with a newly issued token if the cookie/header pair
    // was stale or missing. This includes /auth/refresh.
    if (
      isCsrfError &&
      !SAFE_METHODS.has(method) &&
      !isCsrfRequest(path) &&
      allowRefresh
    ) {
      setCsrfToken(null);
      const newToken = await ensureCsrfToken({ force: true });
      const retryHeaders = new Headers(options.headers);

      if (
        options.body !== undefined &&
        options.body !== null &&
        !isFormData(options.body) &&
        !retryHeaders.has('Content-Type')
      ) {
        retryHeaders.set('Content-Type', 'application/json');
      }

      retryHeaders.set(CSRF_HEADER_NAME, newToken);

      if (accessToken) {
        retryHeaders.set('Authorization', `Bearer ${accessToken}`);
      }

      if (!retryHeaders.has('Accept')) {
        retryHeaders.set('Accept', 'application/json');
      }

      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        method,
        headers: retryHeaders,
        credentials: 'include',
      });

      const retryPayload = await parseResponse(retryResponse);

      if (!retryResponse.ok) {
        throw createApiError(
          retryPayload,
          retryResponse.status,
          `API request failed with status ${retryResponse.status}`,
        );
      }

      const retryData = extractData(retryPayload);
      if (retryData?.csrfToken) {
        setCsrfToken(retryData.csrfToken);
      }

      return retryPayload;
    }

    throw createApiError(
      payload,
      response.status,
      `API request failed with status ${response.status}`,
    );
  }

  const data = extractData(payload);

  if (data?.csrfToken) {
    setCsrfToken(data.csrfToken);
  }

  return payload;
};

const requestFile = async (path, allowRefresh = true) => {
  const headers = new Headers();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (shouldRefresh(response, path, allowRefresh)) {
      const refreshed = await refreshHandler();

      if (refreshed) {
        return requestFile(path, false);
      }
    }

    let payload = null;

    try {
      payload = await response.json();
    } catch {
      // The response may not contain JSON.
    }

    throw createApiError(
      payload,
      response.status,
      `Failed to open file (${response.status})`,
    );
  }

  return response;
};

export const apiClient = {
  setAccessToken(token) {
    accessToken = token ?? null;
  },

  clearAccessToken() {
    accessToken = null;
    csrfToken = null;
  },

  setCsrfToken,
  getCsrfToken,
  ensureCsrfToken,

  setRefreshHandler(handler) {
    refreshHandler = typeof handler === 'function' ? handler : null;
  },

  get: (path, options = {}) =>
    request(path, { ...options, method: 'GET' }),

  post: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: 'POST',
      headers: {
        'Idempotency-Key': createIdempotencyKey(),
        ...(options.headers ?? {}),
      },
      body: isFormData(body) ? body : JSON.stringify(body),
    }),

  put: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: 'PUT',
      headers: {
        'Idempotency-Key': createIdempotencyKey(),
        ...(options.headers ?? {}),
      },
      body: isFormData(body) ? body : JSON.stringify(body),
    }),

  patch: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: 'PATCH',
      headers: {
        'Idempotency-Key': createIdempotencyKey(),
        ...(options.headers ?? {}),
      },
      body: isFormData(body) ? body : JSON.stringify(body),
    }),

  delete: (path, options = {}) =>
    request(path, {
      ...options,
      method: 'DELETE',
      headers: {
        'Idempotency-Key': createIdempotencyKey(),
        ...(options.headers ?? {}),
      },
    }),

  file: requestFile,
};

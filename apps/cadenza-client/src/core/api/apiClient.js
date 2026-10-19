const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}/cadenza-client`;

let accessToken = null;
let csrfToken = null;
let refreshHandler = null;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

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
  const cookieToken = getCookie(CSRF_COOKIE_NAME);

  if (cookieToken) {
    csrfToken = cookieToken;
    return cookieToken;
  }

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

const addRequestHeaders = (options = {}) => {
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

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!SAFE_METHODS.has(method)) {
    const token = getCsrfToken();

    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    } else {
      headers.delete(CSRF_HEADER_NAME);
    }
  }

  return { method, headers, body };
};

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

const shouldRefresh = (response, path, allowRefresh) => {
  return (
    response.status === 401 &&
    allowRefresh &&
    typeof refreshHandler === 'function' &&
    !path.endsWith('/auth/refresh')
  );
};

const request = async (path, options = {}, allowRefresh = true) => {
  const { method, headers, body } = addRequestHeaders(options);

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

    throw createApiError(
      payload,
      response.status,
      `API request failed with status ${response.status}`,
    );
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

  setCsrfToken(token) {
    csrfToken = token ?? null;
  },

  getCsrfToken,

  setRefreshHandler(handler) {
    refreshHandler = typeof handler === 'function' ? handler : null;
  },

  get: (path, options = {}) =>
    request(path, {
      ...options,
      method: 'GET',
    }),

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
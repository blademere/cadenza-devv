const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

let accessToken = null;
let csrfToken = null;
let refreshHandler = null;

const getCookie = (name) => {
  const prefix = `${encodeURIComponent(name)}=`;

  const cookie = document.cookie
    .split('; ')
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

const createIdempotencyKey = () => {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isFormData = (body) => {
  return typeof FormData !== 'undefined' && body instanceof FormData;
};

const request = async (path, options = {}, allowRefresh = true) => {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  const body = options.body;

  if (
    body !== undefined &&
    !isFormData(body) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = csrfToken ?? getCookie('csrfToken');

    if (token) {
      headers.set('x-csrf-token', token);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
  });

  let payload = null;

  if (response.status !== 204) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      allowRefresh &&
      refreshHandler &&
      !path.endsWith('/auth/refresh')
    ) {
      const refreshed = await refreshHandler();

      if (refreshed) {
        return request(path, options, false);
      }
    }

    const error = new Error(
      payload?.message ??
        `API request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.errors = payload?.errors ?? [];

    throw error;
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
    if (
      response.status === 401 &&
      allowRefresh &&
      refreshHandler &&
      !path.endsWith('/auth/refresh')
    ) {
      const refreshed = await refreshHandler();

      if (refreshed) {
        return requestFile(path, false);
      }
    }

    let message = `Failed to open file (${response.status})`;

    try {
      const payload = await response.json();

      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      //
    }

    const error = new Error(message);
    error.status = response.status;
    error.errors = [];

    throw error;
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

  setRefreshHandler(handler) {
    refreshHandler = typeof handler === 'function' ? handler : null;
  },

  get: (path, options) =>
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
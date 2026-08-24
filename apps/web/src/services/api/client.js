const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

let accessToken = null
let csrfToken = null

const getCookie = (name) => {
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split('; ')
    .find((value) => value.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

const createIdempotencyKey = () => {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const request = async (path, options = {}) => {
  const method = options.method ?? 'GET'
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = csrfToken ?? getCookie('csrfToken')
    if (token) headers.set('x-csrf-token', token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })

  let payload = null
  if (response.status !== 204) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message ?? `API request failed with status ${response.status}`)
    error.status = response.status
    error.errors = payload?.errors ?? []
    throw error
  }

  return payload
}

export const apiClient = {
  setAccessToken(token) {
    accessToken = token ?? null
  },
  clearAccessToken() {
    accessToken = null
    csrfToken = null
  },
  setCsrfToken(token) {
    csrfToken = token ?? null
  },
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: 'POST',
      headers: {
        'Idempotency-Key': createIdempotencyKey(),
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(body),
    }),
  put: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
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
}

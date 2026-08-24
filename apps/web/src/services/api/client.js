const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const error = new Error(`API request failed with status ${response.status}`)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

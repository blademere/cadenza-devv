const createXenditClient = ({ secretKey, baseUrl = 'https://api.xendit.co', apiVersion = '2024-11-11' }) => {
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY is required.')
  const request = async (path, options = {}) => {
    const response = await fetch(new URL(path, baseUrl), {
      ...options,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'api-version': apiVersion,
        ...(options.headers || {}),
      },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body?.message || body?.error_code || 'Xendit API request failed.'
      const error = new Error(message)
      error.statusCode = response.status
      error.providerResponse = body
      throw error
    }
    return body
  }
  return Object.freeze({ request })
}
export { createXenditClient }
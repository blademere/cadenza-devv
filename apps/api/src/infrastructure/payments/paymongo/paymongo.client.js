const createPayMongoClient = ({ secretKey, baseUrl = 'https://api.paymongo.com' }) => {
  if (!secretKey) throw new Error('PAYMONGO_SECRET_KEY is required.')

  const request = async (path, options = {}) => {
    const response = await fetch(new URL(path, baseUrl), {
      ...options,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body?.errors?.[0]?.detail || 'PayMongo API request failed.'
      const error = new Error(message)
      error.statusCode = response.status
      error.providerResponse = body
      throw error
    }
    return body
  }

  return Object.freeze({ request })
}

export { createPayMongoClient }

const normalizeAppId = (appId) => {
  if (appId === undefined || appId === null) return null
  if (typeof appId !== 'string') {
    throw new TypeError('Application id must be a string when provided.')
  }

  const normalized = appId.trim()
  return normalized || null
}

const requireAppId = (appId) => {
  const normalized = normalizeAppId(appId)
  if (!normalized) {
    throw new TypeError('Application id is required for application-scoped data access.')
  }
  return normalized
}

const withAppId = (where, appId) => ({
  ...(where || {}),
  appId: requireAppId(appId),
})

export {
  normalizeAppId,
  requireAppId,
  withAppId,
}

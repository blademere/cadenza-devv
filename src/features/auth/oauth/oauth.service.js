const { UnauthorizedError, ConflictError } = require('../../../common/errors/appError')

const {
  findOAuthAccount,
  findUserByEmail,
  createOAuthUser,
  createRefreshTokenRecord,
} = require('../auth.repository')

const {
  createAccessToken,
  createRefreshToken,
} = require('../auth.tokens')

const { env } = require('../../../config')

const {
  getProviderConfig,
} = require('./oauth.providers')

const getRefreshTokenExpiration = () => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/)

  if (!match) {
    throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.')
  }

  const amount = Number(match[1])
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return new Date(Date.now() + amount * multipliers[match[2]])
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  const text = await response.text()

  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error('OAuth provider returned an invalid response.')
  }

  if (!response.ok) {
    throw new Error(`OAuth provider request failed with status ${response.status}.`)
  }

  return { data, response }
}

const exchangeCode = async (provider, code) => {
  const config = getProviderConfig(provider)

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.callbackUrl,
  })

  const { data } = await fetchJson(config.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!data?.access_token) {
    throw new UnauthorizedError('OAuth authorization could not be completed.')
  }

  return data.access_token
}

const getGoogleIdentity = async (accessToken) => {
  const { data } = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!data?.sub || !data.email || data.email_verified !== true) {
    throw new UnauthorizedError('Google account does not provide a verified email address.')
  }

  return {
    provider: 'google',
    providerAccountId: String(data.sub),
    email: data.email.toLowerCase(),
  }
}

const getGithubIdentity = async (accessToken) => {
  const { data: user } = await fetchJson('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!user?.id) {
    throw new UnauthorizedError('GitHub account could not be identified.')
  }

  const { data: emails } = await fetchJson('https://api.github.com/user/emails', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  const verifiedEmail = Array.isArray(emails)
    ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified)
    : null

  if (!verifiedEmail?.email) {
    throw new UnauthorizedError('GitHub account does not provide a verified email address.')
  }

  return {
    provider: 'github',
    providerAccountId: String(user.id),
    email: verifiedEmail.email.toLowerCase(),
  }
}

const getProviderIdentity = async (provider, accessToken) => {
  if (provider === 'google') return getGoogleIdentity(accessToken)
  if (provider === 'github') return getGithubIdentity(accessToken)

  throw new UnauthorizedError('Unsupported OAuth provider.')
}

const authenticateWithOAuth = async ({ provider, code }) => {
  const accessToken = await exchangeCode(provider, code)
  const identity = await getProviderIdentity(provider, accessToken)

  const linkedAccount = await findOAuthAccount(identity)

  let user

  if (linkedAccount) {
    user = linkedAccount.user
  } else {
    const existingUser = await findUserByEmail(identity.email)

    if (existingUser) {
      throw new ConflictError(
        'An account already exists with this email. Sign in with your password first, then link the OAuth provider.',
      )
    }

    user = await createOAuthUser({
      ...identity,
      roleName: env.OAUTH_DEFAULT_ROLE_NAME,
    })
  }

  if (!user.isActive) {
    throw new UnauthorizedError('User account is inactive.')
  }

  const tokenId = require('crypto').randomUUID()
  const refreshToken = createRefreshToken(user, tokenId)
  const accessTokenJwt = createAccessToken(user)

  await createRefreshTokenRecord({
    tokenId,
    token: refreshToken,
    userId: user.id,
    expiresAt: getRefreshTokenExpiration(),
  })

  return {
    user,
    accessToken: accessTokenJwt,
    refreshToken,
  }
}

module.exports = {
  authenticateWithOAuth,
}

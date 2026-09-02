import { crypto } from 'node:crypto'
import {
  UnauthorizedError,
  ConflictError,
} from '../../../common/errors/appError.js'
import {
  findOAuthAccount,
  findUserByEmail,
  createOAuthUser,
  createRefreshTokenRecord,
  linkOAuthAccount as linkOAuthAccountRepository,
  listOAuthAccounts,
  unlinkOAuthAccount as unlinkOAuthAccountRepository,
} from '../auth.repository.js'
import { createAccessToken, createRefreshToken } from '../auth.tokens.js'
import { env } from '../../../config.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import { getProviderConfig } from './oauth.providers.js'

const OAUTH_REQUEST_TIMEOUT_MS = 5000

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OAUTH_REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    })
    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      throw new Error('OAuth provider returned an invalid response.')
    }
    if (!response.ok) {
      const providerError = data?.error
      const providerDescription = data?.error_description
      const detail = [providerError, providerDescription]
        .filter(Boolean)
        .join(': ')
      const error = new Error(
        `OAuth provider request failed with status ${response.status}${detail ? ` (${detail})` : '.'}`
      )
      error.providerStatus = response.status
      error.providerError =
        typeof providerError === 'string' ? providerError : undefined
      error.providerErrorDescription =
        typeof providerDescription === 'string'
          ? providerDescription
          : undefined
      throw error
    }
    return { data, response }
  } finally {
    clearTimeout(timeout)
  }
}

const exchangeCode = async (provider, code, codeVerifier) => {
  const config = getProviderConfig(provider)
  if (typeof codeVerifier !== 'string' || codeVerifier.length < 43) {
    throw new UnauthorizedError('OAuth authorization could not be completed.')
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.callbackUrl,
    code_verifier: codeVerifier,
  })
  const { data } = await fetchJson(config.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!data?.access_token)
    throw new UnauthorizedError('OAuth authorization could not be completed.')
  return data.access_token
}

const getGoogleIdentity = async (accessToken) => {
  const { data } = await fetchJson(
    'https://openidconnect.googleapis.com/v1/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!data?.sub || !data.email || data.email_verified !== true)
    throw new UnauthorizedError(
      'Google account does not provide a verified email address.'
    )
  return {
    provider: 'google',
    providerAccountId: String(data.sub),
    email: data.email.toLowerCase(),
  }
}

const getFacebookIdentity = async (accessToken) => {
  const config = getProviderConfig('facebook')
  const url = new URL(config.userInfoUrl)
  url.searchParams.set('fields', 'id,email')
  url.searchParams.set('access_token', accessToken)

  const { data } = await fetchJson(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!data?.id || !data.email) {
    throw new UnauthorizedError(
      'Facebook account does not provide an email address.'
    )
  }

  return {
    provider: 'facebook',
    providerAccountId: String(data.id),
    email: data.email.toLowerCase(),
  }
}

const getProviderIdentity = async (provider, accessToken) => {
  if (provider === 'google') return getGoogleIdentity(accessToken)
  if (provider === 'facebook') return getFacebookIdentity(accessToken)
  throw new UnauthorizedError('Unsupported OAuth provider.')
}

const authenticateWithOAuth = async ({ provider, code, codeVerifier }) => {
  const accessToken = await exchangeCode(provider, code, codeVerifier)
  const identity = await getProviderIdentity(provider, accessToken)
  const linkedAccount = await findOAuthAccount(identity)
  let user
  if (linkedAccount) user = linkedAccount.user
  else {
    const existingUser = await findUserByEmail(identity.email)
    if (existingUser)
      throw new ConflictError(
        'An account already exists with this email. Sign in with your password first, then link the OAuth provider.'
      )
    user = await createOAuthUser({
      ...identity,
      roleName: env.OAUTH_DEFAULT_ROLE_NAME,
    })
  }
  if (!user.isActive) throw new UnauthorizedError('User account is inactive.')
  const tokenId = crypto.randomUUID()
  const refreshToken = createRefreshToken(user, tokenId)
  const accessTokenJwt = createAccessToken(user)
  await createRefreshTokenRecord({
    tokenId,
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + env.COOKIE_REFRESH_MAX_AGE_MS),
  })
  return { user, accessToken: accessTokenJwt, refreshToken }
}

const linkOAuthAccountWithCode = async ({
  userId,
  provider,
  code,
  codeVerifier,
}) => {
  const accessToken = await exchangeCode(provider, code, codeVerifier)
  const identity = await getProviderIdentity(provider, accessToken)
  const existingAccount = await findOAuthAccount(identity)
  if (existingAccount && existingAccount.userId !== Number(userId))
    throw new ConflictError(
      'This OAuth account is already linked to another user.'
    )
  if (existingAccount && existingAccount.userId === Number(userId))
    return { provider: identity.provider, alreadyLinked: true }
  const existingUser = await findUserByEmail(identity.email)
  if (existingUser && existingUser.id !== Number(userId))
    throw new ConflictError(
      'The verified OAuth email belongs to another account. The provider account cannot be linked automatically.'
    )
  let linked
  try {
    linked = await linkOAuthAccountRepository({
      userId,
      provider: identity.provider,
      providerAccountId: identity.providerAccountId,
    })
  } catch (error) {
    if (error?.code === 'OAUTH_ACCOUNT_ALREADY_LINKED')
      throw new ConflictError(
        'This OAuth account is already linked to another user.'
      )
    if (error?.code === 'USER_NOT_FOUND' || error?.code === 'USER_INACTIVE')
      throw new UnauthorizedError('User account is inactive or does not exist.')
    throw error
  }
  await publish({
    event: 'auth.oauth_link',
    entityType: 'User',
    entityId: Number(userId),
    actorId: Number(userId),
    context: {
      user: {
        id: Number(userId),
        ...(linked?.user?.email ? { email: linked.user.email } : {}),
      },
      oauth: { provider: identity.provider },
    },
    idempotencyKey: `auth.oauth-link:${userId}:${identity.provider}:${identity.providerAccountId}`,
  })
  return { provider: identity.provider, alreadyLinked: false }
}

const getLinkedOAuthAccounts = async (userId) => listOAuthAccounts(userId)

const unlinkOAuthAccount = async ({ userId, provider }) => {
  try {
    await unlinkOAuthAccountRepository({ userId, provider })
  } catch (error) {
    if (error?.code === 'LAST_AUTH_METHOD')
      throw new ConflictError(
        'Cannot unlink the only authentication method on the account.'
      )
    if (error?.code === 'OAUTH_ACCOUNT_NOT_LINKED')
      throw new ConflictError('OAuth account is not linked.')
    if (error?.code === 'USER_NOT_FOUND')
      throw new UnauthorizedError('User account does not exist.')
    throw error
  }
  await publish({
    event: 'auth.oauth_unlink',
    entityType: 'User',
    entityId: Number(userId),
    actorId: Number(userId),
    context: {
      user: { id: Number(userId) },
      oauth: { provider },
    },
    idempotencyKey: `auth.oauth-unlink:${userId}:${provider}`,
  })
  return { provider }
}

export {
  authenticateWithOAuth,
  linkOAuthAccountWithCode,
  getLinkedOAuthAccounts,
  unlinkOAuthAccount,
}

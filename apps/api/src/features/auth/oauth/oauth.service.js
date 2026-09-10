import crypto from 'node:crypto'
import { UnauthorizedError, ConflictError } from '../../../common/errors/appError.js'
import {
  findOAuthAccount,
  findUserByEmail,
  findUserById,
  findRoleByName,
  createUser,
  createOAuthAccount,
  listOAuthAccounts,
  findOAuthAccountByUserAndProvider,
  deleteOAuthAccount,
  countOAuthAccounts,
  withTransaction,
  createRefreshTokenRecord,
} from '../auth.repository.js'
import { createAccessToken, createRefreshToken, hashToken } from '../auth.tokens.js'
import { env } from '../../../config/index.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import { getProviderConfig } from './oauth.providers.js'

const OAUTH_REQUEST_TIMEOUT_MS = 5000
const fetchJson = async (url, options = {}) => { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), OAUTH_REQUEST_TIMEOUT_MS); try { const response = await fetch(url, { ...options, signal: options.signal || controller.signal }); const text = await response.text(); let data; try { data = text ? JSON.parse(text) : null } catch { throw new Error('OAuth provider returned an invalid response.') }; if (!response.ok) { const providerError = data?.error; const providerDescription = data?.error_description; const detail = [providerError, providerDescription].filter(Boolean).join(': '); const error = new Error(`OAuth provider request failed with status ${response.status}${detail ? ` (${detail})` : '.'}`); error.providerStatus = response.status; error.providerError = typeof providerError === 'string' ? providerError : undefined; error.providerErrorDescription = typeof providerDescription === 'string' ? providerDescription : undefined; throw error }; return { data, response } } finally { clearTimeout(timeout) } }
const exchangeCode = async (provider, code, codeVerifier) => { const config = getProviderConfig(provider); if (typeof codeVerifier !== 'string' || codeVerifier.length < 43) throw new UnauthorizedError('OAuth authorization could not be completed.'); const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, grant_type: 'authorization_code', redirect_uri: config.callbackUrl, code_verifier: codeVerifier }); const { data } = await fetchJson(config.tokenUrl, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body }); if (!data?.access_token) throw new UnauthorizedError('OAuth authorization could not be completed.'); return data.access_token }
const getGoogleIdentity = async (accessToken) => { const { data } = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } }); if (!data?.sub || !data.email || data.email_verified !== true) throw new UnauthorizedError('Google account does not provide a verified email address.'); return { provider: 'google', providerAccountId: String(data.sub), email: data.email.toLowerCase() } }
const getFacebookIdentity = async (accessToken) => { const config = getProviderConfig('facebook'); const url = new URL(config.userInfoUrl); url.searchParams.set('fields', 'id,email'); url.searchParams.set('access_token', accessToken); const { data } = await fetchJson(url.toString(), { headers: { Accept: 'application/json' } }); if (!data?.id || !data.email) throw new UnauthorizedError('Facebook account does not provide an email address.'); return { provider: 'facebook', providerAccountId: String(data.id), email: data.email.toLowerCase() } }
const getProviderIdentity = async (provider, accessToken) => { if (provider === 'google') return getGoogleIdentity(accessToken); if (provider === 'facebook') return getFacebookIdentity(accessToken); throw new UnauthorizedError('Unsupported OAuth provider.') }
const authenticateWithOAuth = async ({ provider, code, codeVerifier }) => {
  const accessToken = await exchangeCode(provider, code, codeVerifier)
  const identity = await getProviderIdentity(provider, accessToken)
  const linkedAccount = await findOAuthAccount(identity)
  let user
  if (linkedAccount) user = linkedAccount.user
  else {
    const existingUser = await findUserByEmail(identity.email)
    if (existingUser) throw new ConflictError('An account already exists for this email. Sign in with your password first, then link the OAuth provider.')
    user = await withTransaction(async (tx) => {
      const role = await findRoleByName(env.OAUTH_DEFAULT_ROLE_NAME, tx)
      if (!role) throw new Error(`OAuth default role '${env.OAUTH_DEFAULT_ROLE_NAME}' does not exist.`)
      const currentUser = await findUserByEmail(identity.email, tx)
      if (currentUser) throw new ConflictError('An account already exists for this email address.')
      const createdUser = await createUser({ email: identity.email, passwordHash: null, roleId: role.id, emailVerifiedAt: new Date() }, tx)
      await createOAuthAccount({ userId: createdUser.id, provider: identity.provider, providerAccountId: identity.providerAccountId }, tx)
      return createdUser
    })
  }
  if (!user.isActive) throw new UnauthorizedError('User account is inactive.')
  const tokenId = crypto.randomUUID()
  const refreshToken = createRefreshToken(user, tokenId)
  const accessTokenJwt = createAccessToken(user)
  await createRefreshTokenRecord({ tokenId, tokenHash: hashToken(refreshToken), userId: user.id, expiresAt: new Date(Date.now() + env.COOKIE_REFRESH_MAX_AGE_MS) })
  return { user, accessToken: accessTokenJwt, refreshToken }
}
const linkOAuthAccountWithCode = async ({ userId, provider, code, codeVerifier }) => {
  const accessToken = await exchangeCode(provider, code, codeVerifier)
  const identity = await getProviderIdentity(provider, accessToken)
  const existingAccount = await findOAuthAccount(identity)
  if (existingAccount && existingAccount.userId !== Number(userId)) throw new ConflictError('This OAuth account is already linked to another user.')
  if (existingAccount && existingAccount.userId === Number(userId)) return { provider: identity.provider, alreadyLinked: true }
  const existingUser = await findUserByEmail(identity.email)
  if (existingUser && existingUser.id !== Number(userId)) throw new ConflictError('The verified OAuth email belongs to another account. The provider account cannot be linked automatically.')
  const user = await findUserById(userId)
  if (!user) throw new UnauthorizedError('User account is inactive or does not exist.')
  if (!user.isActive) throw new UnauthorizedError('User account is inactive or does not exist.')
  try {
    await withTransaction(async (tx) => {
      const account = await findOAuthAccount(identity, tx)
      if (account && account.userId !== Number(userId)) throw new ConflictError('This OAuth account is already linked to another user.')
      if (!account) await createOAuthAccount({ userId, provider: identity.provider, providerAccountId: identity.providerAccountId }, tx)
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('This OAuth account is already linked to another user.')
    throw error
  }
  await publish({ event: 'auth.oauth_link', entityType: 'User', entityId: Number(userId), actorId: Number(userId), context: { user: { id: Number(userId), email: user.email }, oauth: { provider: identity.provider } }, idempotencyKey: `auth.oauth-link:${userId}:${identity.provider}:${identity.providerAccountId}` })
  return { provider: identity.provider, alreadyLinked: false }
}
const getLinkedOAuthAccounts = async (userId) => listOAuthAccounts(userId)
const unlinkOAuthAccount = async ({ userId, provider }) => {
  const user = await findUserById(userId)
  if (!user) throw new UnauthorizedError('User account does not exist.')
  const account = await findOAuthAccountByUserAndProvider({ userId, provider })
  if (!account) throw new ConflictError('OAuth account is not linked.')
  const accountCount = await countOAuthAccounts(userId)
  if (!user.passwordHash && accountCount <= 1) throw new ConflictError('Cannot unlink the only authentication method on the account.')
  await deleteOAuthAccount(account.id)
  await publish({ event: 'auth.oauth_unlink', entityType: 'User', entityId: Number(userId), actorId: Number(userId), context: { user: { id: Number(userId) }, oauth: { provider } }, idempotencyKey: `auth.oauth-unlink:${userId}:${provider}` })
  return { provider }
}

export { authenticateWithOAuth, linkOAuthAccountWithCode, getLinkedOAuthAccounts, unlinkOAuthAccount }

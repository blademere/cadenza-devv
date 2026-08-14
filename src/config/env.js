const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config()

const emptyToUndefined = (value) => (value === '' ? undefined : value)

const optionalEnvString = z.preprocess(
  emptyToUndefined,
  z.string().optional(),
)

const optionalEnvUrl = z.preprocess(
  emptyToUndefined,
  z.url().optional(),
)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
  JWT_ACCESS_EXPIRES_IN: z.string().min(2).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(2).default('7d'),
  SENTRY_DSN: z.url().optional().or(z.literal('')),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_DOMAIN: optionalEnvString,
  COOKIE_REFRESH_MAX_AGE_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000),
  OAUTH_STATE_SECRET: z.string().min(32, 'OAUTH_STATE_SECRET must be at least 32 characters.'),

  // OAuth providers are optional. Empty strings in .env mean the provider is disabled.
  OAUTH_GOOGLE_CLIENT_ID: optionalEnvString,
  OAUTH_GOOGLE_CLIENT_SECRET: optionalEnvString,
  OAUTH_GOOGLE_CALLBACK_URL: optionalEnvUrl,

  OAUTH_GITHUB_CLIENT_ID: optionalEnvString,
  OAUTH_GITHUB_CLIENT_SECRET: optionalEnvString,
  OAUTH_GITHUB_CALLBACK_URL: optionalEnvUrl,

  OAUTH_DEFAULT_ROLE_NAME: z.string().min(1).default('client'),
  OAUTH_FRONTEND_SUCCESS_URL: z.url().default('http://localhost:5173/auth/callback/success'),
  OAUTH_FRONTEND_FAILURE_URL: z.url().default('http://localhost:5173/auth/callback/failure'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')

  throw new Error(`Invalid environment configuration. ${details}`)
}

const data = parsed.data

const parseDurationMs = (value) => {
  const match = value.match(/^(\d+)(ms|s|m|h|d)$/)

  if (!match) {
    throw new Error(`${value} must use ms, s, m, h, or d format.`)
  }

  const amount = Number(match[1])
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return amount * multipliers[match[2]]
}

if (data.COOKIE_SAME_SITE === 'none' && !data.COOKIE_SECURE) {
  throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is 'none'.")
}

if (data.NODE_ENV === 'production' && !data.COOKIE_SECURE) {
  throw new Error('COOKIE_SECURE must be true in production.')
}

if (data.NODE_ENV === 'production' && data.CORS_ORIGIN === '*') {
  throw new Error("CORS_ORIGIN must not be '*' in production.")
}

const refreshTokenLifetimeMs = parseDurationMs(data.JWT_REFRESH_EXPIRES_IN)

if (data.COOKIE_REFRESH_MAX_AGE_MS !== refreshTokenLifetimeMs) {
  throw new Error(
    'COOKIE_REFRESH_MAX_AGE_MS must exactly match JWT_REFRESH_EXPIRES_IN.',
  )
}

const hasGoogleConfig = Boolean(
  data.OAUTH_GOOGLE_CLIENT_ID ||
    data.OAUTH_GOOGLE_CLIENT_SECRET ||
    data.OAUTH_GOOGLE_CALLBACK_URL,
)

if (
  hasGoogleConfig &&
  (!data.OAUTH_GOOGLE_CLIENT_ID ||
    !data.OAUTH_GOOGLE_CLIENT_SECRET ||
    !data.OAUTH_GOOGLE_CALLBACK_URL)
) {
  throw new Error(
    'Google OAuth requires OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET, and OAUTH_GOOGLE_CALLBACK_URL.',
  )
}

const hasGithubConfig = Boolean(
  data.OAUTH_GITHUB_CLIENT_ID ||
    data.OAUTH_GITHUB_CLIENT_SECRET ||
    data.OAUTH_GITHUB_CALLBACK_URL,
)

if (
  hasGithubConfig &&
  (!data.OAUTH_GITHUB_CLIENT_ID ||
    !data.OAUTH_GITHUB_CLIENT_SECRET ||
    !data.OAUTH_GITHUB_CALLBACK_URL)
) {
  throw new Error(
    'GitHub OAuth requires OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET, and OAUTH_GITHUB_CALLBACK_URL.',
  )
}

if (data.NODE_ENV === 'production' && data.OAUTH_FRONTEND_SUCCESS_URL.startsWith('http://')) {
  throw new Error('OAUTH_FRONTEND_SUCCESS_URL must use HTTPS in production.')
}

if (data.NODE_ENV === 'production' && data.OAUTH_FRONTEND_FAILURE_URL.startsWith('http://')) {
  throw new Error('OAUTH_FRONTEND_FAILURE_URL must use HTTPS in production.')
}

module.exports = Object.freeze(data)

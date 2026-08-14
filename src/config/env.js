const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),

  JWT_ACCESS_EXPIRES_IN: z.string().min(2).default('15m'),

  JWT_REFRESH_EXPIRES_IN: z.string().min(2).default('7d'),

  SENTRY_DSN: z.url().optional().or(z.literal('')),

  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  COOKIE_DOMAIN: z.string().optional(),

  COOKIE_REFRESH_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(7 * 24 * 60 * 60 * 1000),

  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_GOOGLE_CALLBACK_URL: z.url().optional(),

  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CALLBACK_URL: z.url().optional(),

  OAUTH_DEFAULT_ROLE_NAME: z.string().min(1).default('client'),

  OAUTH_FRONTEND_SUCCESS_URL: z
    .url()
    .default('http://localhost:5173/auth/callback/success'),

  OAUTH_FRONTEND_FAILURE_URL: z
    .url()
    .default('http://localhost:5173/auth/callback/failure'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')

  throw new Error(`Invalid environment configuration. ${details}`)
}

const data = parsed.data

if (data.COOKIE_SAME_SITE === 'none' && !data.COOKIE_SECURE) {
  throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is 'none'.")
}

if (data.NODE_ENV === 'production' && !data.COOKIE_SECURE) {
  throw new Error('COOKIE_SECURE must be true in production.')
}

if (data.NODE_ENV === 'production' && data.CORS_ORIGIN === '*') {
  throw new Error("CORS_ORIGIN must not be '*' in production.")
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

if (
  data.NODE_ENV === 'production' &&
  data.OAUTH_FRONTEND_SUCCESS_URL.startsWith('http://')
) {
  throw new Error(
    'OAUTH_FRONTEND_SUCCESS_URL must use HTTPS in production.',
  )
}

if (
  data.NODE_ENV === 'production' &&
  data.OAUTH_FRONTEND_FAILURE_URL.startsWith('http://')
) {
  throw new Error(
    'OAUTH_FRONTEND_FAILURE_URL must use HTTPS in production.',
  )
}

module.exports = Object.freeze(data)

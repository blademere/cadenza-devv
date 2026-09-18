import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()
const emptyToUndefined = (value) => (value === '' ? undefined : value)
const optionalEnvString = z.preprocess(emptyToUndefined, z.string().optional())
const optionalEnvUrl = z.preprocess(emptyToUndefined, z.url().optional())
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  REDIS_URL: z.url().default('redis://localhost:6379'),
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
  PASSWORD_RESET_URL: z.url().default('http://localhost:5173/auth/reset-password?token='),
  EMAIL_VERIFICATION_URL: z.url().default('http://localhost:5173/auth/verify-email?token='),
  METRICS_TOKEN: optionalEnvString,
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: optionalEnvString,
  OAUTH_GOOGLE_CLIENT_ID: optionalEnvString,
  OAUTH_GOOGLE_CLIENT_SECRET: optionalEnvString,
  OAUTH_GOOGLE_CALLBACK_URL: optionalEnvUrl,
  OAUTH_FACEBOOK_CLIENT_ID: optionalEnvString,
  OAUTH_FACEBOOK_CLIENT_SECRET: optionalEnvString,
  OAUTH_FACEBOOK_CALLBACK_URL: optionalEnvUrl,
  OAUTH_FACEBOOK_API_VERSION: z.string().regex(/^v\d+\.\d+$/, 'OAUTH_FACEBOOK_API_VERSION must use the vMAJOR.MINOR format.').default('v24.0'),
  OAUTH_DEFAULT_ROLE_NAME: z.string().min(1).default('client'),
  OAUTH_FRONTEND_SUCCESS_URL: z.url().default('http://localhost:5173/auth/callback/success'),
  OAUTH_FRONTEND_FAILURE_URL: z.url().default('http://localhost:5173/auth/callback/failure'),
  RESEND_API_KEY: optionalEnvString,
  EMAIL_FROM: optionalEnvString,
  STORAGE_PROVIDER: z.enum(['local']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().min(1).default('./storage'),
  PAYMONGO_SECRET_KEY: optionalEnvString,
  PAYMONGO_WEBHOOK_SECRET: optionalEnvString,
  PAYMONGO_MODE: z.enum(['test', 'live']).default('test'),
  PAYMONGO_API_BASE_URL: z.url().default('https://api.paymongo.com'),
  PAYMONGO_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
  PAYMONGO_SUCCESS_URL: optionalEnvUrl,
  PAYMONGO_CANCEL_URL: optionalEnvUrl,
  PAYMONGO_PAYMENT_METHODS: z.string().default('card,gcash,qrph'),
  PAYMONGO_PASS_ON_FEES: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  AUTHORIZATION_CACHE_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  AUTHORIZATION_CACHE_TRUST_POSITIVE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
})
const parsed = envSchema.safeParse(process.env)
if (!parsed.success) { const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '); throw new Error(`Invalid environment configuration. ${details}`) }
const data = parsed.data
const parseDurationMs = (value) => { const match = value.match(/^(\d+)(ms|s|m|h|d)$/); if (!match) throw new Error(`${value} must use ms, s, m, h, or d format.`); const amount = Number(match[1]); const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }; return amount * multipliers[match[2]] }
if (data.COOKIE_SAME_SITE === 'none' && !data.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is 'none'.")
if (data.NODE_ENV === 'production' && !data.COOKIE_SECURE) throw new Error('COOKIE_SECURE must be true in production.')
if (data.NODE_ENV === 'production' && data.CORS_ORIGIN === '*') throw new Error("CORS_ORIGIN must not be '*' in production.")
const hasPayMongoCredentials = Boolean(data.PAYMONGO_SECRET_KEY || data.PAYMONGO_WEBHOOK_SECRET)
if (hasPayMongoCredentials && (!data.PAYMONGO_SECRET_KEY || !data.PAYMONGO_WEBHOOK_SECRET)) throw new Error('PayMongo requires PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET together.')
if (hasPayMongoCredentials && (!data.PAYMONGO_SUCCESS_URL || !data.PAYMONGO_CANCEL_URL)) throw new Error('PayMongo requires PAYMONGO_SUCCESS_URL and PAYMONGO_CANCEL_URL when enabled.')
if (hasPayMongoCredentials && data.PAYMONGO_MODE === 'live' && !data.PAYMONGO_SECRET_KEY.startsWith('sk_live_')) throw new Error('PAYMONGO_SECRET_KEY must be a live key when PAYMONGO_MODE is live.')
if (hasPayMongoCredentials && data.PAYMONGO_MODE === 'test' && !data.PAYMONGO_SECRET_KEY.startsWith('sk_test_')) throw new Error('PAYMONGO_SECRET_KEY must be a test key when PAYMONGO_MODE is test.')
if (data.NODE_ENV === 'production' && !data.METRICS_TOKEN) throw new Error('METRICS_TOKEN is required in production.')
if (data.METRICS_TOKEN && data.METRICS_TOKEN.length < 32) throw new Error('METRICS_TOKEN must be at least 32 characters.')
if (data.SEED_ADMIN_PASSWORD && data.SEED_ADMIN_PASSWORD.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters when configured.')
if ((data.SEED_ADMIN_EMAIL && !data.SEED_ADMIN_PASSWORD) || (!data.SEED_ADMIN_EMAIL && data.SEED_ADMIN_PASSWORD)) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be configured together.')
const refreshTokenLifetimeMs = parseDurationMs(data.JWT_REFRESH_EXPIRES_IN)
if (data.COOKIE_REFRESH_MAX_AGE_MS !== refreshTokenLifetimeMs) throw new Error('COOKIE_REFRESH_MAX_AGE_MS must exactly match JWT_REFRESH_EXPIRES_IN.')
if (data.NODE_ENV === 'production' && data.PASSWORD_RESET_URL.startsWith('http://')) throw new Error('PASSWORD_RESET_URL must use HTTPS in production.')
if (data.NODE_ENV === 'production' && data.EMAIL_VERIFICATION_URL.startsWith('http://')) throw new Error('EMAIL_VERIFICATION_URL must use HTTPS in production.')
const hasGoogleCredentials = Boolean(data.OAUTH_GOOGLE_CLIENT_ID || data.OAUTH_GOOGLE_CLIENT_SECRET)
if (hasGoogleCredentials && (!data.OAUTH_GOOGLE_CLIENT_ID || !data.OAUTH_GOOGLE_CLIENT_SECRET || !data.OAUTH_GOOGLE_CALLBACK_URL)) throw new Error('Google OAuth requires OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET, and OAUTH_GOOGLE_CALLBACK_URL.')
const hasFacebookCredentials = Boolean(data.OAUTH_FACEBOOK_CLIENT_ID || data.OAUTH_FACEBOOK_CLIENT_SECRET)
if (hasFacebookCredentials && (!data.OAUTH_FACEBOOK_CLIENT_ID || !data.OAUTH_FACEBOOK_CLIENT_SECRET || !data.OAUTH_FACEBOOK_CALLBACK_URL)) throw new Error('Facebook OAuth requires OAUTH_FACEBOOK_CLIENT_ID, OAUTH_FACEBOOK_CLIENT_SECRET, and OAUTH_FACEBOOK_CALLBACK_URL.')
if (data.NODE_ENV === 'production' && data.OAUTH_FRONTEND_SUCCESS_URL.startsWith('http://')) throw new Error('OAUTH_FRONTEND_SUCCESS_URL must use HTTPS in production.')
if (data.NODE_ENV === 'production' && data.OAUTH_FRONTEND_FAILURE_URL.startsWith('http://')) throw new Error('OAUTH_FRONTEND_FAILURE_URL must use HTTPS in production.')

export default Object.freeze(data)

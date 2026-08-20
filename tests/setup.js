process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/express_app?schema=public'
process.env.REDIS_URL ??= 'redis://localhost:6379'
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-012345678901234567890123456789'
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-012345678901234567890123456789'
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m'
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d'
process.env.COOKIE_REFRESH_MAX_AGE_MS ??= String(7 * 24 * 60 * 60 * 1000)
process.env.METRICS_TOKEN = 'test-metrics-token-012345678901234567890123456789'

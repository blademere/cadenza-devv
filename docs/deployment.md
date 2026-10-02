# Deployment

This repository deploys as two services:

- `apps/cadenza-client` is the Vite frontend on Vercel.
- `apps/api` is the Express/Prisma API on Railway using the root `Dockerfile`.

## Vercel

Create a Vercel project from the repository root. The committed `vercel.json` sets the workspace install, client build, output directory, and SPA fallback.

Set this production environment variable:

```text
VITE_API_BASE_URL=https://<railway-api-domain>/api/v1
```

## Railway

Create an API service from the repository root. Railway uses `railway.json`, builds `Dockerfile`, runs Prisma migrations as the pre-deploy command, and checks `/health/live`.

Provision PostgreSQL and Redis in the Railway project, then configure these API variables:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=<railway-postgres-connection-url>
REDIS_URL=<railway-redis-url>
CORS_ORIGIN=https://<vercel-domain>
JWT_ACCESS_SECRET=<random-secret-at-least-32-characters>
JWT_REFRESH_SECRET=<different-random-secret-at-least-32-characters>
METRICS_TOKEN=<random-secret-at-least-32-characters>
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
PASSWORD_RESET_URL=https://<vercel-domain>/auth/reset-password?token=
EMAIL_VERIFICATION_URL=https://<vercel-domain>/auth/verify-email?token=
OAUTH_FRONTEND_SUCCESS_URL=https://<vercel-domain>/auth/callback/success
OAUTH_FRONTEND_FAILURE_URL=https://<vercel-domain>/auth/callback/failure
```

Add the optional email, OAuth, payment, and Sentry variables only when those integrations are enabled. Keep `COOKIE_DOMAIN` empty unless both services are deliberately placed under a shared parent domain.

## Pre-push checks

From the repository root:

```powershell
npm.cmd ci
npm.cmd run validate:workspaces
npm.cmd run validate:dependencies
npm.cmd run validate:lockfile
npm.cmd run build --workspace @cadenza-app/api
npm.cmd run build --workspace @cadenza-app/cadenza-client
```

Do not commit `.env`, credentials, or generated dependency directories.

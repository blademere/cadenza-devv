# Admin Web

Administrative web application for the Express App platform.

## Development

From the repository root:

```bash
npm install
npm run dev:admin-web
```

The Vite development server uses port `5174` by default.

## Architecture

`apps/admin-web` is an independent frontend workspace. It can consume the shared Express API while keeping administrative UI, routing, and feature modules isolated from `apps/web`.

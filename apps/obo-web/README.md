# OBO Web

Operational web application for the Express App platform.

## Development

From the repository root:

```bash
npm install
npm run dev:obo-web
```

The Vite development server uses port `5173` by default.

## Architecture

`apps/obo-web` is an independent frontend workspace for OBO operations. It consumes the shared Express API and contains authentication, operational workflows, and permission-controlled administration features.

# Web application

React frontend application for the Express App workspace.

## Development

From the repository root:

```bash
npm run dev:web
```

The Vite development server runs on `http://localhost:5173` and proxies `/api` requests to the Express server at `http://localhost:3000`.

The frontend is intentionally separate from `apps/server` so it can evolve and be deployed independently while consuming the server API through explicit contracts.

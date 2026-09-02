# API ESM Migration

Target: `apps/api` CommonJS JavaScript runtime → native Node.js ESM.

## Rules

- Migration branch: `chore/api-esm-migration`, based on `development`.
- Do not modify `development` directly.
- Preserve application behavior.
- Do not combine ESM work with architecture, feature, Prisma, or notification changes.
- Keep intentional operational CommonJS scripts as `.cjs`.
- Do not switch `apps/api/package.json` to `type: module` until the imported runtime graph is ESM-safe.

## Phase 0 — Baseline

Required checks:

```text
npm ci
npm run lint
npm test
npm run build
npm run validate
npm --workspace @express-app/api run prisma:validate
npm --workspace @express-app/api run prisma:generate
npm --workspace @express-app/api run prisma:migrate:deploy
```

Runtime checks:

```text
API starts
Worker starts
/health/live
/health/ready
Authentication
Background jobs
Notification delivery
```

Baseline is not a migration pass until the checks above are green.

## Phase order

1. Baseline and freeze.
2. ESM runtime foundation.
3. Infrastructure: config → logging → Prisma → Redis → storage → monitoring → metrics → Swagger → common middleware/utilities.
4. Platform services and consumers together.
5. Features and OBO one module at a time.
6. Tests/tooling/configuration.
7. CI/Docker/runtime validation.
8. Final merge gate.

## Phase 1 guardrail

Before changing `type` to `module`, convert every JavaScript module reachable from:

- `src/server.js`
- `src/app.js`
- `src/platform/platform-worker.js`

Use explicit `.js` extensions for local ESM imports and replace CommonJS exports with ESM exports. Preserve `.cjs` scripts.

## Merge gate

```text
[ ] API starts
[ ] Worker starts
[ ] Unit tests pass
[ ] Integration tests pass
[ ] Lint passes
[ ] Format check passes
[ ] Architecture validation passes
[ ] Authorization validation passes
[ ] Migration validation passes
[ ] Prisma validation passes
[ ] OpenAPI validation passes
[ ] Build passes
[ ] Docker build passes
[ ] Docker runtime passes
[ ] Health checks pass
[ ] Authentication verified
[ ] Jobs verified
[ ] Notifications verified
[ ] No unintended database changes
```

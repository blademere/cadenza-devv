# Production Operations Runbook

This runbook defines the deployment and recovery contract for production.

## 1. Health and probes

- Liveness: `GET /health/live` must only verify that the process is running.
- Readiness: `GET /health/ready` verifies PostgreSQL and Redis dependencies.
- Load balancers and orchestrators must remove an instance from service on readiness failure.
- Never use `/metrics` as a health probe.

## 2. Database migrations

Run migrations as a deployment gate before routing traffic to the new application version:

```bash
npm run prisma:migrate:deploy
```

Migrations must be backward-compatible with the currently running application during rolling deployments. Destructive changes require a separate expand/contract deployment.

The GitHub Actions migration workflow is manual and requires a deployment database secret; it does not embed credentials in the repository.

## 3. Rollback

Application rollback is an image/version rollback. Database migrations are forward-only unless a tested down migration is explicitly provided. Do not automatically run `prisma migrate reset` or attempt an untested destructive reverse migration in production.

Recommended deployment sequence:

1. Deploy backward-compatible schema.
2. Deploy application image.
3. Run readiness and smoke tests.
4. Shift traffic.
5. If application health fails, roll back the application image.
6. Keep the database at the compatible schema until the incident is resolved.

## 4. PostgreSQL backups and restore

Create encrypted, off-host PostgreSQL backups using the deployment platform's secret-managed `DATABASE_URL` and object storage. The repository provides a safe local/CI wrapper:

```bash
npm run db:backup -- ./backups/express-app.sql.gz
npm run db:restore -- ./backups/express-app.sql.gz
```

Restore is intentionally destructive and requires `ALLOW_DESTRUCTIVE_RESTORE=true`. Restore drills should be performed at least quarterly and must verify application startup and critical queries afterward.

Minimum production policy:

- daily full backup;
- point-in-time recovery where the PostgreSQL provider supports WAL/PITR;
- retention appropriate to business requirements;
- backup encryption at rest and in transit;
- restore test at least quarterly.

## 5. Redis failure strategy

Redis is an operational dependency for distributed rate limiting and cache operations. A Redis outage must not cause an application-wide process crash.

- Readiness should fail when Redis is required for serving traffic.
- Cache misses should fall back to the source of truth where safe.
- Do not silently replace distributed rate limiting with an in-memory limiter in a multi-instance deployment.
- Restore Redis from persistence only when the deployment requires durable queue/cache state; otherwise rebuild cache state from PostgreSQL.
- Alert on Redis connection errors and elevated latency.

## 6. Queue and outbox strategy

The application currently uses the database outbox worker for event delivery; the BullMQ adapter is not an active worker implementation. The outbox is therefore the source of truth for retry/recovery.

- Claim events with a lease so another worker can recover stale work.
- Mark successful events processed.
- Mark failed events with the error and retain enough state to retry safely.
- Event handlers must be idempotent.
- Repeatedly failing events require operational quarantine/dead-letter handling before manual replay.
- Do not delete failed events as a substitute for dead-lettering.

When BullMQ becomes an active production queue, configure explicit `attempts`, exponential backoff, and a bounded failed/dead-letter queue, and monitor queue depth and age.

## 7. Audit logging

Administrative mutations must call `recordAudit` with:

- authenticated actor ID;
- action name;
- entity type and ID;
- before/after state where safe;
- request metadata such as IP/user-agent where appropriate.

Never put passwords, access tokens, refresh tokens, client secrets, or other credentials in `before`, `after`, or `metadata`.

Audit records are append-oriented operational evidence. Retention and access must be controlled separately from normal application logs.

## 8. Incident rollback checklist

- Stop the rollout.
- Confirm readiness and dependency health.
- Roll back the application image if the schema remains compatible.
- Preserve failed outbox records for investigation/replay.
- Do not run destructive database commands during an active incident without a verified restore point.
- Record the incident and recovery actions in the deployment/audit system.

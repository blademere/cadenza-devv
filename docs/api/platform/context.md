# Platform Execution Context

The platform execution context carries request-scoped metadata across asynchronous API work without introducing business/domain state.

## Context contract

```js
{
  requestId,
  correlationId,
  actorId,
  actorType,
  organizationId,
  metadata,
}
```

### Field rules

- `requestId`: identifies one inbound HTTP request. Existing `X-Request-ID` handling remains the source of truth.
- `correlationId`: identifies the wider operation chain. `X-Correlation-ID` is accepted when supplied; otherwise the request ID is used for the initial HTTP operation.
- `actorId`: authenticated actor identifier when authentication has established one.
- `actorType`: generic actor classification supplied by the authentication layer.
- `organizationId`: optional tenant/organization identifier when the authenticated context provides one.
- `metadata`: small, non-domain execution metadata. Do not put permit, application, workflow, or other business entities in this object.

## Propagation

HTTP requests initialize the context in `platform/context/context.middleware.js`.

Authentication may enrich the active context with actor information through `setActorContext()`.

Platform services can read the context with `getContext()` or require it with `requireContext()`.

Use `withContext()` when a nested platform operation needs to derive a context with additional execution metadata. Derived metadata is merged without changing the parent context.

## Boundaries

The context is not a replacement for service parameters. Business identifiers and domain state should continue to be passed explicitly to module and feature services.

The context also does not combine these separate reliability concerns:

```text
HTTP idempotency
    != event deduplication
    != job retry protection
```

Those mechanisms may consume `requestId` or `correlationId`, but each retains its own contract.

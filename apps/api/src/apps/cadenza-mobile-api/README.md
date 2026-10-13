# Cadenza Mobile API

This folder is the backend boundary for the Cadenza React Native mobile application.

The mobile frontend lives in:

```text
apps/cadenza-mobile
```

The mobile backend module lives in:

```text
apps/api/src/apps/cadenza-mobile-api
```

## Design

This module is intentionally a thin API facade. It reuses the existing Cadenza authentication and client feature routes instead of duplicating business logic.

Current exposed features:

```text
/auth
/enrollments
/room-bookings
/instrument-rentals
```

The module does not yet expose student schedules, student attendance, student progress, learning materials, notifications, or instructor self-service because those backend contracts are not currently implemented in the existing API.

## Mounting

This folder is not automatically mounted by creating it. The backend application owner must mount it in the central API router:

```js
import cadenzaMobileApi from '../apps/cadenza-mobile-api/app.js';

router.use('/cadenza-mobile', cadenzaMobileApi);
```

The expected public API base URL after mounting is:

```text
/api/v1/cadenza-mobile
```

Only the backend application owner should add that mount line to the central router. This module itself does not modify the existing API router.

## Authentication

The mobile client sends:

```http
Authorization: Bearer <accessToken>
```

Login is available at:

```http
POST /api/v1/cadenza-mobile/auth/login
```

The mobile module uses a mobile-local authentication controller. It reuses the existing authentication service but uses the mobile cookie path `/api/v1/cadenza-mobile/auth` so refresh and logout do not depend on the web client cookie path.

## Authorization

The client feature routes use the authenticated Cadenza account. Client-only operations require an account with:

```text
account.type = CLIENT
```

Do not expose instructor or staff administration routes through this module unless a separate mobile authorization contract is approved.

## Response Format

Responses use the existing backend format:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

## Validation

Run the backend JavaScript syntax check from the API workspace after changing this folder:

```text
node --check src/apps/cadenza-mobile-api/app.js
```

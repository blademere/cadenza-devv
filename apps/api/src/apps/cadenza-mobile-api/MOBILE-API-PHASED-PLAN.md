# Mobile API Phased Integration Plan

## Goal

Connect the React Native application in `apps/cadenza-mobile` to a dedicated backend API boundary without changing the Cadenza web client.

Backend module:

```text
apps/api/src/apps/cadenza-mobile-api
```

Frontend module:

```text
apps/cadenza-mobile
```

## Mobile Platform Requirement

The frontend is a React Native application built with Expo. All mobile API contracts and frontend behavior must support both Android and iOS through the same Expo project.

Platform requirements:

- Use React Native and Expo-compatible APIs for mobile features.
- Keep authentication, API requests, storage, navigation, and UI behavior compatible with Android and iOS.
- Test API connectivity on an Android emulator, iOS simulator, and at least one physical device when possible.
- Use a LAN API hostname for physical-device testing instead of `localhost`.
- Avoid web-only browser APIs in the mobile frontend.
- Document platform-specific differences when Android and iOS require different configuration.

## Current Status

| Phase | Status | Reason |
| --- | --- | --- |
| Phase 1: Mount the Mobile API | Implemented, HTTP verification pending | The central API router now mounts this module at `/cadenza-mobile`. |
| Phase 2: Verify Authentication | Implemented, HTTP verification pending | Mobile-local auth routes and mobile cookie paths exist. |
| Phase 3: Connect Existing Client Features | Implemented in module | Enrollment, room booking, and instrument rental routes are exposed. |
| Phase 4: Add Student Learning APIs | Pending | Student schedule, attendance, progress, materials, and notification endpoints are not implemented. |
| Phase 5: Add Instructor Self-Service APIs | Pending | Instructor self-service contracts and ownership rules are not implemented. |
| Phase 6: Connect the Mobile Frontend | Expo bundle verified, HTTP verification pending | JavaScript API/auth clients target the mobile API, and Android/iOS Expo bundles build successfully. |
| Phase 7: Team Verification | Pending | Requires the mounted backend, seeded accounts, and device testing. |

The next executable team action is to run the Phase 2 HTTP checks against the mounted route.

## Phase 1: Mount the Mobile API - IMPLEMENTED, HTTP VERIFICATION PENDING

Owner: backend application owner

Add the mobile router to the central backend router:

```js
import cadenzaMobileApi from '../apps/cadenza-mobile-api/app.js';

router.use('/cadenza-mobile', cadenzaMobileApi);
```

Expected base URL:

```text
/api/v1/cadenza-mobile
```

Do not mount this router under `/api/mobile/v1` unless the mobile frontend is intentionally configured to use that path.

Acceptance checks:

- [x] `POST /api/v1/cadenza-mobile/auth/login` is mounted through the central API router.
- [ ] Unknown mobile routes return the normal API error response.
- [ ] Existing Cadenza web routes continue to work.

The central mount is documented with mobile-specific comments in `apps/api/src/routes/index.js`.

## Phase 2: Verify Authentication - IMPLEMENTED, HTTP VERIFICATION PENDING

The mobile app must be able to call:

```http
POST /auth/login
GET  /auth/me
POST /auth/logout
POST /auth/refresh
```

Login request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

The response must provide:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-access-token",
    "user": {},
    "account": {},
    "csrfToken": "csrf-token"
  }
}
```

Confirm the account mapping before frontend role routing:

```text
CLIENT -> student experience
STAFF  -> instructor or staff experience
```

The mobile module uses a mobile-specific authentication controller inside this folder. It reuses the shared authentication service while setting the refresh cookie for `/api/v1/cadenza-mobile/auth`. Verify that the deployed proxy preserves this cookie path and the CSRF cookie/header pair.

Implemented in:

- `features/auth/auth.routes.js`
- `features/auth/auth.controller.js`

Remaining checks:

- [x] Development database migrations applied.
- [x] Development `CLIENT` test account seeded; see `MOBILE-API-TEST-ACCOUNT.md`.
- [ ] Login returns a real access token for a seeded account.
- [ ] `/auth/me` accepts the returned bearer token.
- [ ] Refresh accepts the mobile refresh cookie and CSRF header.
- [ ] Logout revokes the refresh token and clears the mobile cookie.

## Phase 3: Connect Existing Client Features - IMPLEMENTED IN MODULE

The mobile API facade currently exposes these existing features:

### Enrollments

```http
GET   /enrollments/available-packages
GET   /enrollments/packages/:packageId/instructors
GET   /enrollments/packages/:packageId/instructors/:instructorId/availability
GET   /enrollments/mine
POST  /enrollments
GET   /enrollments/:id
PATCH /enrollments/:id/cancel
```

### Room bookings

```http
GET   /room-bookings/available
GET   /room-bookings/mine
POST  /room-bookings
GET   /room-bookings/:id
PATCH /room-bookings/:id/cancel
```

### Instrument rentals

```http
GET   /instrument-rentals/available
GET   /instrument-rentals/available/:id
GET   /instrument-rentals/check-availability
GET   /instrument-rentals/packages
GET   /instrument-rentals/packages/:id
GET   /instrument-rentals/mine
GET   /instrument-rentals/mine/:id
POST  /instrument-rentals
PATCH /instrument-rentals/:id/cancel
```

All mutations must support an `Idempotency-Key` header.

The facade is implemented in `app.js` and reuses the existing domain route modules. HTTP verification remains blocked until Phase 1 is mounted.

## Phase 4: Add Student Learning APIs - PENDING

The current mobile student screens need live endpoints for:

```http
GET   /student/dashboard
GET   /student/schedule
GET   /student/attendance
GET   /student/progress
GET   /student/materials
GET   /student/materials/:id
GET   /student/notifications
GET   /student/profile
PATCH /student/profile
```

These routes must identify the current student from the authenticated client account. The mobile app must not provide another student's ID to read private data.

Minimum response requirements:

- Use `{ success, message, data }`.
- Return ISO 8601 timestamps.
- Return stable resource IDs.
- Return empty arrays instead of null for collection fields.
- Return `401` for missing or invalid authentication.
- Return `403` when the account lacks client access.

## Phase 5: Add Instructor Self-Service APIs - PENDING

The existing `/instructors` routes are for administrator and front-desk operations. They should not be used as instructor self-service endpoints.

Create mobile instructor routes only after the backend confirms how an authenticated staff account maps to an instructor:

```http
GET    /instructor/me
GET    /instructor/dashboard
GET    /instructor/schedule
GET    /instructor/availability
POST   /instructor/availability
PATCH  /instructor/availability/:id
DELETE /instructor/availability/:id
GET    /instructor/attendance
POST   /instructor/attendance
GET    /instructor/progress
PATCH  /instructor/progress/:id
GET    /instructor/notifications
```

Every ownership-sensitive route must derive the instructor from the bearer token. The mobile client must not be able to request another instructor's data by changing an ID in the URL.

## Phase 6: Connect the Mobile Frontend - PARTIAL

After the backend mount and endpoint contracts are verified, configure the mobile frontend with:

```text
EXPO_PUBLIC_MOBILE_API_URL=http://YOUR_API_HOST:3000/api/v1/cadenza-mobile
```

For a physical device, use the development computer's LAN IP instead of `localhost`.

The mobile frontend must remain an Expo React Native application and must be verified on both Android and iOS.

The mobile frontend should then:

1. Call the real login endpoint.
2. Store the access token and account.
3. Attach the bearer token to authenticated requests.
4. Route `CLIENT` accounts to the student experience.
5. Route approved instructor accounts to the instructor experience.
6. Unwrap the backend `data` property.
7. Send idempotency keys for mutations.
8. Display explicit loading, empty, unauthorized, forbidden, and network-error states.
9. Avoid silently replacing failed API responses with mock data.

Already present in the mobile frontend:

- JavaScript Axios client in `apps/cadenza-mobile/services/api.js`.
- JavaScript authentication service in `apps/cadenza-mobile/services/authService.js`.
- JavaScript token/account storage in `apps/cadenza-mobile/services/authStorage.js`.
- JavaScript client feature service in `apps/cadenza-mobile/services/clientService.js`.
- JavaScript startup and login routes.

Still required:

- [ ] Set `EXPO_PUBLIC_MOBILE_API_URL` to `/api/v1/cadenza-mobile`.
- [ ] Confirm the mobile frontend can reach the mounted API.
- [x] Build the Expo app for Android.
- [x] Build the Expo app for iOS.
- [ ] Test the API connection from a physical Android or iOS device.
- [ ] Replace remaining mock student and instructor screens when their backend phases are complete.

Verified locally on 2026-10-05:

- `npx expo export --platform android` passed.
- `npx expo export --platform ios` passed.
- Runtime API login still requires the backend server, database, mounted route, and a seeded account.

## Phase 7: Team Verification - PENDING

Before merging:

- [x] Backend router mount is committed in the working tree.
- [ ] Mobile base URL is documented for local, emulator, and physical-device testing.
- [ ] Real login works with a seeded account.
- [ ] `/auth/me` returns the current account.
- [ ] Client authorization works for enrollment, booking, and rental routes.
- [ ] Invalid tokens return `401`.
- [ ] Wrong account types return `403`.
- [ ] Mutations accept and process idempotency keys.
- [ ] CORS or network access permits the Expo development environment.
- [x] Expo Android bundle builds.
- [x] Expo iOS bundle builds.
- [ ] Physical-device API connectivity passes.
- [ ] Mobile and backend use the same response shapes.
- [ ] Student and instructor feature gaps are either implemented or explicitly marked as pending.

## Scope Rule

Only this folder should contain the dedicated mobile API facade and its mobile-specific backend additions. Reuse existing domain services where possible. Do not copy business logic from the Cadenza client app, and do not modify the Cadenza web client to support mobile behavior.

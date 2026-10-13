# Cadenza Mobile and Backend Integration Handoff

## Purpose

This document describes the API contract required to connect the Cadenza Expo React Native mobile application to the Cadenza backend.

The mobile application is located in:

```text
apps/cadenza-mobile
```

The backend Cadenza API is mounted under:

```text
/api/v1/cadenza-mobile
```

Do not modify the cadenza-client web application for this integration. Mobile-only changes should remain inside `apps/cadenza-mobile`.

## Current Mobile Stack

- Expo React Native
- Expo Router
- JavaScript and JSX
- Axios
- AsyncStorage
- NativeWind
- Role-based routes for students and instructors

## Required Mobile API Base URL

The mobile Axios client should use:

```text
http://YOUR_API_HOST:3000/api/v1/cadenza-mobile
```

For a physical device, do not use `localhost`. Use the development machine's local network IP address:

```text
http://192.168.1.10:3000/api/v1/cadenza-mobile
```

The mobile environment variable should be configured as:

```text
EXPO_PUBLIC_MOBILE_API_URL=http://YOUR_API_HOST:3000/api/v1/cadenza-mobile
```

The mobile app defaults to `10.0.2.2` on an Android emulator and `localhost` on
an iOS simulator. A physical device must use the development computer's LAN IP.

## Standard Response Format

Most backend responses use this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Mobile services must read the actual payload from:

```text
data.data
```

Some older controller responses may omit `message`, but they still return `success` and `data`.

## Authentication

### Login

```http
POST /auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "jwt-access-token",
    "csrfToken": "csrf-token",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "emailVerified": true
    },
    "account": {
      "type": "CLIENT",
      "id": "account-id",
      "status": "ACTIVE",
      "person": {
        "id": "person-id",
        "firstName": "Maria",
        "lastName": "Santos",
        "email": "user@example.com",
        "phone": "+639000000000"
      }
    }
  }
}
```

The mobile app should store:

- `data.accessToken`
- `data.user`
- `data.account`
- `data.csrfToken`, if required by the selected session strategy

The mobile login screen calls this endpoint for real accounts. A separate local
instructor demo login is available for UI work and does not authenticate against
the backend.

### Account Types

The backend currently returns these account types:

```text
CLIENT
STAFF
```

The backend does not currently return `student` or `instructor` as the account type.

Recommended initial mobile mapping:

```text
CLIENT -> Student mobile experience
STAFF  -> Staff or instructor experience
```

This mapping must be confirmed against the database and business rules. A staff account may be an administrator or front-desk user, not necessarily an instructor.

### Authenticated Requests

Authenticated requests must include:

```http
Authorization: Bearer <accessToken>
```

The existing mobile API client already attempts to attach the stored token through an Axios request interceptor.

### Current User

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

Expected response:

```json
{
  "success": true,
  "data": {
    "user": {},
    "account": {}
  }
}
```

The exact nested data should be preserved by the mobile auth state.

### Refresh and Logout

```http
POST /auth/refresh
POST /auth/logout
```

The backend uses refresh-token cookies and CSRF protection for these operations. React Native does not automatically provide browser cookie behavior in the same way as a browser.

Before implementing refresh-token rotation, decide whether to:

1. Add a native cookie-management solution to the mobile app, or
2. Provide a mobile-specific token strategy in the backend.

Logout also requires an `Idempotency-Key` header and CSRF handling under the current backend contract.

## Client Features Available from the Backend

These routes are protected by client authorization and are suitable for a logged-in `CLIENT` account.

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

Create enrollment request:

```json
{
  "lessonPackageId": "package-uuid",
  "sessions": [
    {
      "instructorId": "instructor-uuid",
      "roomId": "room-uuid",
      "scheduledStart": "2026-10-10T09:00:00.000Z",
      "scheduledEnd": "2026-10-10T10:00:00.000Z",
      "metadata": {}
    }
  ],
  "paymentObligationId": null,
  "paymentExpiresAt": null,
  "metadata": {}
}
```

The enrollment mutation should include:

```http
Idempotency-Key: unique-request-id
```

### Room Bookings

```http
GET   /room-bookings/available?scheduledStart=<date>&scheduledEnd=<date>
GET   /room-bookings/mine
POST  /room-bookings
GET   /room-bookings/:id
PATCH /room-bookings/:id/cancel
```

Create room booking request:

```json
{
  "roomId": "room-uuid",
  "paymentPlan": "FULL_PAYMENT",
  "scheduledStart": "2026-10-10T09:00:00.000Z",
  "scheduledEnd": "2026-10-10T10:00:00.000Z"
}
```

Cancel room booking request:

```json
{
  "cancellationReason": "Schedule changed"
}
```

Room booking mutations require an `Idempotency-Key` header.

### Instrument Rentals

```http
GET   /instrument-rentals/available
GET   /instrument-rentals/available/:id
GET   /instrument-rentals/check-availability?scheduledStart=<date>&scheduledEnd=<date>
GET   /instrument-rentals/packages
GET   /instrument-rentals/packages/:id
GET   /instrument-rentals/mine
GET   /instrument-rentals/mine/:id
POST  /instrument-rentals
PATCH /instrument-rentals/:id/cancel
```

Create rental request fields include:

```json
{
  "rentalType": "INDIVIDUAL",
  "instrumentId": "instrument-uuid",
  "instrumentIds": ["instrument-uuid"],
  "rentalPackageId": "package-uuid",
  "paymentPlan": "FULL_PAYMENT",
  "scheduledStart": "2026-10-10T09:00:00.000Z",
  "scheduledEnd": "2026-10-10T10:00:00.000Z"
}
```

The exact instrument fields depend on whether the rental type is `INDIVIDUAL` or `PACKAGE`.

## Instructor and Staff API Status

The mobile instructor services are prepared to use these proposed endpoints when
the backend implements and confirms them:

```text
/instructors/dashboard
/instructorSchedule
/instructorAvailability
/timeSlots
```

The instructor dashboard, schedule, attendance, progress, notifications, and
availability screens currently use local fixtures by default. These routes are
not currently present in the mounted backend Cadenza mobile API, so switching
the data mode to `api` requires backend implementation first. Time slot choices
remain local presets; the mobile app does not call a `/timeSlots` route.

The backend does have instructor administration routes:

```http
GET    /instructors
GET    /instructors/:id
GET    /instructors/:id/availability
POST   /instructors/:id/availability
PATCH  /instructors/:id/availability/:availabilityId
PATCH  /instructors/:id/availability/:availabilityId/deactivate
```

These routes require administrator or front-desk authorization. They are not instructor self-service endpoints.

### Required Backend Decision

The backend team must confirm one of the following options:

#### Option A: Add instructor self-service endpoints

Recommended routes:

```http
GET   /instructor/me
GET   /instructor/dashboard
GET   /instructor/schedule
GET   /instructor/availability
POST  /instructor/availability
PATCH /instructor/availability/:id
DELETE /instructor/availability/:id
GET   /instructor/attendance
POST  /instructor/attendance
GET   /instructor/progress
PATCH /instructor/progress/:id
GET   /instructor/notifications
```

These routes should identify the instructor from the bearer token and must not require the mobile app to send an instructor ID for ownership-sensitive operations.

#### Option B: Use staff administration routes

This would allow only administrator or front-desk accounts to manage instructor data. It does not support a normal instructor mobile experience and should not be used for instructor self-service without additional authorization rules.

## Student Mobile Feature Status

The student screens call mobile service functions that return fixture data by
default and can be switched to API mode. The paths below are proposed contracts;
they are not implemented or verified in the backend yet:

- Dashboard
- Schedule
- Attendance
- Progress
- Materials
- Material details
- Profile
- Notifications

The backend currently exposes enrollment, room booking, and instrument rental functionality, but there are no verified mobile endpoints for:

```text
Student lesson schedule
Student attendance history
Student progress data
Student learning materials assigned to a client
Student notifications
Student profile editing
```

The backend team should provide client-authorized routes if these screens must show live data.

Proposed student routes matching the mobile service paths:

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

The route names may differ, but each route should be restricted to the authenticated client account and should return the standard `{ success, data }` response format.

## Suggested Response Shapes for Missing Mobile Features

### Student dashboard

```json
{
  "success": true,
  "data": {
    "student": {},
    "enrollment": {},
    "upcomingClasses": [],
    "attendanceSummary": {
      "present": 0,
      "absent": 0,
      "late": 0,
      "rate": 0
    },
    "overallProgress": 0
  }
}
```

### Student schedule

```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "date": "2026-10-10",
      "startTime": "09:00",
      "endTime": "10:00",
      "lesson": "Piano Lesson",
      "instructor": {},
      "room": {},
      "status": "SCHEDULED"
    }
  ]
}
```

### Student attendance

```json
{
  "success": true,
  "data": {
    "summary": {
      "present": 0,
      "absent": 0,
      "late": 0,
      "rate": 0
    },
    "records": []
  }
}
```

### Student progress

```json
{
  "success": true,
  "data": {
    "overallProgress": 0,
    "completedLessons": 0,
    "totalLessons": 0,
    "skills": [],
    "feedback": []
  }
}
```

### Learning materials

```json
{
  "success": true,
  "data": [
    {
      "id": "material-uuid",
      "title": "Introduction to Music",
      "description": "Basic concepts and fundamentals of music.",
      "type": "PDF",
      "fileUrl": "https://api.example.com/file.pdf",
      "status": "NOT_STARTED",
      "uploadedAt": "2026-10-05T10:00:00.000Z"
    }
  ]
}
```

## Backend Requirements Checklist

Please confirm the following before mobile integration begins:

- [ ] The mobile base URL is `/api/v1/cadenza-mobile`.
- [ ] Mobile login is allowed for the intended client and staff account types.
- [ ] The backend response wrapper is consistently `{ success, message, data }`.
- [ ] The meaning of `CLIENT` and `STAFF` for mobile users is confirmed.
- [ ] Instructor self-service endpoints are available, or instructor mobile functionality is postponed.
- [ ] Student schedule endpoints are available.
- [ ] Student attendance endpoints are available.
- [ ] Student progress endpoints are available.
- [ ] Student learning material endpoints are available.
- [ ] Student notification endpoints are available.
- [ ] Profile read and update endpoints are available if profile editing is required.
- [ ] Refresh-token cookie behavior for React Native is documented.
- [ ] CSRF requirements for mobile refresh and logout are documented.
- [ ] Idempotency-key requirements are documented for every mobile mutation.
- [ ] API errors use a consistent format that mobile can display.
- [ ] Development API access works from an Android emulator, iOS simulator, and physical device.

## Current Mobile Data Modes

Set `EXPO_PUBLIC_MOBILE_DATA_MODE=mock` (or leave it unset) to use local
fixtures. Set it to `api` after the backend routes are available. A local mock
instructor account remains on fixtures even in API mode because its token is
not a backend credential. Restart Expo after changing environment variables.

Fixtures are in `services/mockData.js`; API calls are grouped in
`services/studentService.js`, `services/instructor.service.js`, and the
instructor schedule and availability services. A failed API call is shown as an
error; it does not silently replace API data with fixtures.

## Remaining Mobile Integration Work

Once the backend confirms the contracts, implement the mobile connection in this order:

1. Confirm proposed student and instructor response/request shapes with the backend team.
2. Implement the missing backend routes and authorization before enabling API mode for those features.
3. Confirm mobile refresh-token/cookie and CSRF behavior.
4. Add profile editing and any missing mutation services when their contracts are agreed.
5. Connect enrollment, room booking, and instrument-rental screens to their backend routes as needed.
6. Verify API mode from the target emulator or device after backend work is deployed.

## Important Constraint

Do not make the mobile app guess or silently substitute mock data when a backend request fails. During integration, clearly distinguish between:

- Live backend data
- Local mock data
- Empty backend data
- Unsupported backend functionality

This will make it clear which feature is connected and which feature still requires backend work.

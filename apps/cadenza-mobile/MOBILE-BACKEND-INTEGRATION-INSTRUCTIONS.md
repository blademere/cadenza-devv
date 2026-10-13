# Cadenza Mobile Backend Integration Instructions

## Scope

These instructions define the backend work required to connect the Cadenza Expo React Native mobile application.

The mobile application is located at:

```text
apps/cadenza-mobile
```

Do not modify the Cadenza web client for this integration. Mobile-side changes must remain inside `apps/cadenza-mobile`.

## Backend API Base Path

The Cadenza backend API is mounted at:

```text
/api/v1/cadenza-mobile
```

The mobile client must connect to a complete URL such as:

```text
http://192.168.1.10:3000/api/v1/cadenza-mobile
```

Do not require the mobile app to use `/api/mobile/v1` unless that route is explicitly added to the backend.

## Authentication Contract

Implement and verify these endpoints:

```http
POST /auth/login
GET  /auth/me
POST /auth/refresh
POST /auth/logout
GET  /auth/csrf
```

### Login request

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Login response

Return the standard response wrapper:

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

The mobile application stores the access token and sends it on authenticated requests:

```http
Authorization: Bearer <accessToken>
```

## Account Type Confirmation

The current backend account types are:

```text
CLIENT
STAFF
```

The mobile application currently has student and instructor experiences. Confirm the intended mapping:

```text
CLIENT -> Student
STAFF  -> Instructor or staff
```

Do not assume that every `STAFF` account is an instructor. If instructors require a separate identity, expose that identity in the authenticated account response or provide a self-service instructor endpoint.

## Response Format

Use this format for all new mobile-consumed endpoints:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

For errors, return a consistent format containing an HTTP status and readable message:

```json
{
  "success": false,
  "message": "A readable error message."
}
```

## Existing Client Endpoints

The following endpoints already exist for authenticated client accounts and can be connected by the mobile app:

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

## Required Idempotency Support

Every mobile mutation must accept an `Idempotency-Key` header.

Required mutations include:

```http
POST  /enrollments
PATCH /enrollments/:id/cancel
POST  /room-bookings
PATCH /room-bookings/:id/cancel
POST  /instrument-rentals
PATCH /instrument-rentals/:id/cancel
POST  /auth/logout
POST  /auth/refresh
```

The key must be unique per user action and safe to retry.

Example:

```http
Idempotency-Key: 2d4e5e08-9f4a-4b4b-a7d4-unique-request
```

## Missing Student Endpoints

The mobile student screens currently contain mock data. To make them live, provide client-authorized endpoints for:

```http
GET   /client/dashboard
GET   /client/schedule
GET   /client/attendance
GET   /client/progress
GET   /client/materials
GET   /client/materials/:id
GET   /client/notifications
GET   /client/profile
PATCH /client/profile
```

These endpoints must use the authenticated client from the bearer token. The mobile app must not send a student or client ID to access the current user's private data.

### Student dashboard response

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

### Student schedule response

```json
{
  "success": true,
  "data": [
    {
      "id": "session-id",
      "scheduledStart": "2026-10-10T09:00:00.000Z",
      "scheduledEnd": "2026-10-10T10:00:00.000Z",
      "lesson": "Piano Lesson",
      "instructor": {},
      "room": {},
      "status": "SCHEDULED"
    }
  ]
}
```

### Student attendance response

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

### Student progress response

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

### Student materials response

```json
{
  "success": true,
  "data": [
    {
      "id": "material-id",
      "title": "Introduction to Music",
      "description": "Basic concepts and fundamentals of music.",
      "type": "PDF",
      "fileUrl": "https://api.example.com/material.pdf",
      "status": "NOT_STARTED",
      "uploadedAt": "2026-10-05T10:00:00.000Z"
    }
  ]
}
```

## Missing Instructor Endpoints

The mobile application currently requests these paths, but they are not available in the backend contract:

```text
/instructors/dashboard
/instructorSchedule
/instructorAvailability
/timeSlots
```

The existing `/instructors` routes are administrative routes and require administrator or front-desk permissions. They do not provide normal instructor self-service.

Provide instructor self-service routes:

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

These endpoints must:

- Identify the instructor from the bearer token.
- Prevent one instructor from reading or modifying another instructor's data.
- Return `403` for accounts without instructor access.
- Return `401` for missing or invalid authentication.
- Use the standard `{ success, message, data }` response format.

### Instructor dashboard response

```json
{
  "success": true,
  "data": {
    "instructor": {},
    "stats": {
      "assignedStudents": 0,
      "todaySessions": 0,
      "pendingProgressNotes": 0
    },
    "todaySchedule": [],
    "upcomingLessons": [],
    "studentProgress": []
  }
}
```

### Instructor schedule response

```json
{
  "success": true,
  "data": [
    {
      "id": "session-id",
      "scheduledStart": "2026-10-10T09:00:00.000Z",
      "scheduledEnd": "2026-10-10T10:00:00.000Z",
      "student": {},
      "lesson": {},
      "room": {},
      "status": "SCHEDULED"
    }
  ]
}
```

### Instructor availability response

```json
{
  "success": true,
  "data": [
    {
      "id": "availability-id",
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:00",
      "isActive": true
    }
  ]
}
```

### Attendance mutation request

```json
{
  "sessionId": "session-id",
  "status": "PRESENT",
  "notes": "Good progress today."
}
```

Allowed attendance values should be documented and consistent. Suggested values:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

## Mobile Networking Requirements

The mobile client needs these backend behaviors:

- CORS or network access configured for the Expo development environment.
- LAN access when testing on a physical device.
- Stable JSON responses.
- Correct HTTP status codes.
- No HTML error pages for API failures.
- ISO 8601 date-time values.
- Stable IDs for all resources.
- Explicit nullable fields where a value can be absent.
- Pagination metadata for large collections.

## Acceptance Criteria

Backend integration is ready when:

- [ ] Mobile can call `/auth/login` using a real account.
- [ ] Login returns an access token and account information.
- [ ] Authenticated mobile requests succeed with the bearer token.
- [ ] `/auth/me` returns the current account.
- [ ] The intended `CLIENT` and `STAFF` role mapping is confirmed.
- [ ] Client enrollment endpoints return usable data.
- [ ] Client booking endpoints return usable data.
- [ ] Client rental endpoints return usable data.
- [ ] Student schedule, attendance, progress, materials, and notification endpoints are available if required.
- [ ] Instructor self-service endpoints are available if required.
- [ ] All mobile mutations support idempotency keys.
- [ ] Refresh and logout behavior is documented for React Native cookies and CSRF.
- [ ] Unauthorized and forbidden responses are consistent.
- [ ] The API can be reached from the target emulator or physical device.

## Mobile Implementation Order

After the backend confirms the contract, the mobile work should proceed in this order:

1. Configure the API base URL.
2. Replace mock login with the backend login endpoint.
3. Store the access token and account object.
4. Restore the session when the app starts.
5. Add authenticated route protection.
6. Add response unwrapping for `data.data`.
7. Connect enrollment data.
8. Connect student schedule, attendance, progress, materials, and notifications.
9. Connect instructor self-service features only after their endpoints are confirmed.
10. Add idempotency keys to mutations.
11. Add loading, empty, unauthorized, forbidden, and network-error states.
12. Test on Android emulator, iOS simulator, and physical device.

## Important Rule

Do not silently display mock data when a live API request fails. The mobile application must clearly distinguish between:

- Live backend data
- Local development mock data
- Empty backend data
- Unsupported backend functionality

# Application Domain Phase 5 — Appointments

## Objective

Make appointment scheduling data application-owned without moving the reusable appointment capability out of `features/appointments`.

## Ownership model

```text
App
 └── AppointmentType (direct appId)
      ├── AvailabilitySchedule (inherits through AppointmentType)
      └── AppointmentSlot (inherits through AppointmentType)

App
 └── Appointment (direct appId)
      ├── AppointmentType
      └── AppointmentSlot
```

`AvailabilitySchedule` and `AppointmentSlot` do not duplicate `appId`; their application ownership is established through their `AppointmentType` relationship. `Appointment` stores `appId` directly because it is a first-class application-owned record and is frequently queried independently.

## Shared code remains shared

The following remain under `features/appointments`:

- appointment repository
- appointment service
- appointment controllers/routes
- slot generation service
- appointment validation/mapping

The feature receives `appId` as explicit context. It does not depend on an OBO-specific module.

## Repository boundary

Appointment reads, lists, mutations, slot claims, and resource lookups require `appId`.

Examples:

```js
findAppointment(id, appId)
findAppointmentType(id, appId)
findSlot(id, appId)
listAppointments({ appId, ...filters })
```

Nested schedule and slot queries scope through the owning `AppointmentType`.

## HTTP boundary

The appointment API now requires application context before entering appointment routes. Controllers pass `req.security.app.id` into the shared service layer.

This makes the existing appointment API compatible with the application authorization model rather than leaving it as a globally scoped data endpoint.

## OBO integration

OBO submission appointments pass OBO `appId` into the shared appointment service. OBO receiving and permit hydration also retrieve appointments using the OBO application scope.

## Migration

Migration `20260916160000_scope_appointments_to_application`:

1. adds nullable `appId` to `AppointmentType` and `Appointment`;
2. assigns existing appointment types to the authoritative OBO application;
3. derives appointment ownership from `AppointmentType`;
4. validates that no appointment type or appointment remains unowned;
5. makes both `appId` columns required;
6. adds application indexes and foreign keys.

No ownership is inferred from `userId`.

## Uniqueness

Existing global uniqueness for appointment identifiers is intentionally retained for now. Phase 13 will determine whether identifiers such as appointment type keys and appointment reference numbers should become application-scoped.

## Isolation invariant

For every appointment:

```text
Appointment.appId = current application
Appointment.appointmentType.appId = Appointment.appId
Appointment.slot.appointmentType.appId = Appointment.appId
```

Cross-application appointment access must fail at the repository/service boundary even if an attacker knows another application's record ID.

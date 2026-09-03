# OBO Web Architecture

`apps/obo-web` is the general-purpose Office of the Building Official (OBO) frontend. It is not an administrator-only application.

## Application boundaries

Keep OBO frontend concerns inside `apps/obo-web` until a domain has enough code and ownership to justify extraction into an Nx library.

```text
src/
├── app/             # application bootstrap, providers, router, theme
├── layouts/         # application-level shells
├── config/          # application configuration and permission vocabulary
├── features/        # business/domain capabilities
├── components/      # reusable UI not owned by one domain
├── services/        # cross-feature application services
└── styles/          # global styles
```

## Feature boundaries

Use business domains, not user roles:

```text
features/
├── auth/
├── authorization/
├── dashboard/
├── plan-permits/
├── receiving/
├── submission-appointments/
├── professionals/
├── inspections/
└── users/
```

Do not create role-specific feature or layout folders such as `administrator/`, `receiving-officer/`, or `inspector/`. Roles are represented by server-issued permissions and capabilities.

## Dependency direction

```text
app/layouts
      ↓
features
      ↓
services / shared components
      ↓
API transport
```

A feature owns its domain API/data-access and UI. Shared components must not contain domain-specific workflow logic.

## Authorization

The server is authoritative. The frontend uses the authorization context to control navigation, routes, page capabilities, and action visibility.

```text
User → Role → Permissions → Navigation → Route → Page → Action → Backend
```

Frontend code must not branch on role names when a permission/capability can express the requirement.

## Domain extraction

Do not pre-create a large Nx library hierarchy. Extract mature domains later using business scope and responsibility boundaries such as feature, data-access, UI, and utility libraries.

## Phase 0 constraints

Phase 0 establishes structure only. It does not implement the OBO business workflows. Later phases introduce the domain features incrementally and must preserve these boundaries.

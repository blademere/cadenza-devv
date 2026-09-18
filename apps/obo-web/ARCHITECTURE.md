# OBO Web Architecture

`apps/obo-web` is the general-purpose Office of the Building Official (OBO) frontend. It is not an administrator-only application.

## Application boundaries

Keep OBO frontend concerns inside `apps/obo-web` until a domain has enough code and ownership to justify extraction into an Nx library.

```text
src/
├── app/             # application bootstrap, providers, router, theme
├── layouts/         # application-level shells
├── config/          # application configuration, capabilities, and permission vocabulary
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
├── applications/
├── receiving/
├── submission-appointments/
├── professionals/
├── inspections/
└── users/
```

The `applications/` feature owns the OBO application workspace, including application pages, permit-type management, form management, application API access, and application queries.

Do not create role-specific feature or layout folders such as `administrator/`, `receiving-officer/`, or `inspector/`. Roles are represented by server-issued permissions and application-owned capabilities.

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

The server is authoritative for effective authorization state. The frontend owns application capabilities and uses the server-issued authorization context to control navigation, routes, page capabilities, and action visibility.

```text
Server: User → Role → Effective Permissions + Modules
                                  ↓
OBO Web:                    Capabilities → Navigation → Route → Page → Action
```

The API authorization platform must remain UI-agnostic. It must not define frontend routes, navigation entries, icons, labels, or capability registries. OBO-specific capability definitions belong under `apps/obo-web/src/config/` and are evaluated against the server-issued permission set.

Frontend code must not branch on role names when a permission/capability can express the requirement.

## Application terminology

The OBO Web application domain uses `applications` as its implementation vocabulary.

Use:

- `applications/` for the feature directory
- `applications.api.js` for application API access
- `applications.queries.js` for application queries and mutations
- `useApplications`, `useApplication`, and related application hooks
- `permissions.applications` for application authorization

Do not reintroduce legacy permit-specific implementation names for the application feature.

## Domain extraction

Do not pre-create a large Nx library hierarchy. Extract mature domains later using business scope and responsibility boundaries such as feature, data-access, UI, and utility libraries.

## Phase 0 constraints

Phase 0 establishes structure only. It does not implement the OBO business workflows. Later phases introduce the domain features incrementally and must preserve these boundaries.

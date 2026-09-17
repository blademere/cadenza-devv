# Application Domain Ownership — Phase 7 Forms

## Decision

`Form` is application-owned data. `FormVersion` and all form-definition children inherit ownership through their parent `Form`.

```text
App
└── Form
    └── FormVersion
        ├── FormSection
        ├── FormField
        │   └── FormOption
        └── FormSubmission
```

The reusable Forms capability remains in `platform/forms`; application-specific OBO orchestration remains under `apps/obo`.

## Ownership boundary

Every Form read/write requires an explicit `appId`. The Forms repository includes `appId` in Form predicates and constrains version operations through the parent Form.

This prevents an application from resolving another application's form by ID or key.

## Child records

No `appId` is duplicated onto FormVersion, FormSection, FormField, FormOption, or FormSubmission in this phase. Their ownership is inherited through the FormVersion → Form relation.

## OBO integration

OBO permit-type form creation, version management, form resolution, and form validation pass the OBO application's `appId` to the shared Forms service.

The platform Forms service does not depend on Express request objects or OBO-specific code.

## Migration

Migration `20260916180000_scope_forms_to_application` adds `Form.appId`, backfills existing forms to the authoritative OBO application, fails if ownership cannot be established, makes the column required, adds indexes, and creates the App foreign key.

Existing global uniqueness for `Form.key` is intentionally retained. Application-scoped uniqueness is deferred to Phase 13.

## Non-goals

- Do not move `platform/forms` into OBO.
- Do not add duplicated `appId` columns to every form child.
- Do not infer ownership from the submitting user.
- Do not change FormVersion numbering or status semantics.

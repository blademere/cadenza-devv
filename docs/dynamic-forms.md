# Dynamic Forms Platform

The forms platform makes business forms configuration-driven while keeping the execution and validation engine in application code.

## Model

```text
Form
 └── FormVersion
      ├── FormSection
      ├── FormField
      │    └── FormOption
      └── FormSubmission

DocumentType
 └── DocumentRequirement
```

A form version is immutable once published. New changes are made by creating a new draft version and publishing it. Submissions keep a reference to the exact version used so historical data remains interpretable.

## Field definition

```js
{
  key: "estimated_cost",
  label: "Estimated cost",
  type: "number",
  required: true,
  validation: [
    { operator: "min", value: 0 },
    { operator: "max", value: 100000000 }
  ]
}
```

Supported field types currently include `text`, `textarea`, `email`, `phone`, `number`, `integer`, `boolean`, `date`, `datetime`, `select`, and `multiselect`.

Select fields store options relationally instead of putting the option list into the submission JSON.

## Conditional visibility

Visibility rules are declarative JSON and support `all`, `any`, and `not` groups:

```js
{
  all: [
    { field: "scope", operator: "equals", value: "RENOVATION" },
    { field: "occupancy", operator: "equals", value: "COMMERCIAL" }
  ]
}
```

A field that is hidden is not required and is not validated.

## Validation

Validation rules support:

- `min` / `max`
- `min_length` / `max_length`
- `equals` / `not_equals`
- `in` / `not_in`
- `contains`
- `regex`
- `matches_field`

Example:

```js
{
  operator: "matches_field",
  otherField: "email",
  message: "Email confirmation must match email."
}
```

The engine validates field types, required fields, select options, built-in email/date checks, and configured rules. It does not execute arbitrary JavaScript from configuration.

## Document requirements

Document requirements are reusable and can be attached to a form version or workflow version. They support:

- required/optional documents
- allowed file types
- maximum size
- conditional requirements
- document source (`CLIENT`, `OFFICE`, `PROFESSIONAL`, `PHYSICAL`, etc.)

The document requirement metadata does not imply that the client must upload every document. This allows the permit domain to represent hardcopy documents separately from electronic uploads.

## Example permit form

```js
await createForm({
  key: "building-permit",
  name: "Building Permit Application",
  entityType: "PermitApplication",
  sections: [
    { key: "applicant", title: "Owner / Applicant" },
    { key: "location", title: "Construction Location" },
    { key: "scope", title: "Scope of Work" },
  ],
  fields: [
    { key: "last_name", label: "Last Name", type: "text", required: true, sectionKey: "applicant" },
    { key: "first_name", label: "First Name", type: "text", required: true, sectionKey: "applicant" },
    {
      key: "scope",
      label: "Scope of Work",
      type: "select",
      required: true,
      sectionKey: "scope",
      options: [
        { value: "NEW_CONSTRUCTION", label: "New Construction" },
        { value: "RENOVATION", label: "Renovation" },
        { value: "REPAIR", label: "Repair" },
      ],
    },
    {
      key: "renovation_details",
      label: "Renovation Details",
      type: "textarea",
      required: true,
      sectionKey: "scope",
      visibility: { field: "scope", operator: "equals", value: "RENOVATION" },
    },
  ],
})
```

This lets the permit feature use the same form engine for building, electrical, mechanical, plumbing, and other permit types without creating a separate controller/model implementation for every form.

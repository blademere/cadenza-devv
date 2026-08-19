# Dynamic Forms Platform

The forms platform makes business forms configuration-driven while keeping execution and validation in application code. Forms are a platform mechanism; the domain module owns the meaning of the submitted data.

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

A form version is immutable once published. New changes are made by creating a new draft version and publishing it. Submissions retain the exact version used so historical data remains interpretable.

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

Select fields store options relationally instead of putting the option list into submission JSON.

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

A hidden field is not required and is not validated.

## Validation

Validation rules support:

- `min` / `max`
- `min_length` / `max_length`
- `equals` / `not_equals`
- `in` / `not_in`
- `contains`
- `regex`
- `matches_field`

The engine validates field types, required fields, select options, built-in email/date checks, and configured rules. It does not execute arbitrary JavaScript from configuration.

## Dynamic forms vs core domain data

Dynamic forms should not replace strongly modeled relationships.

Use normal domain columns and relations for concepts such as:

- person identity
- case relationships
- participant relationships
- permit type
- professional registration
- workflow state

Use dynamic fields for genuinely variable attributes such as configurable classifications, optional measurements, or organization-specific metadata.

## Document requirements

Document requirements are reusable and can be attached to a form or workflow configuration. They support:

- required/optional documents
- allowed file types
- maximum size
- conditional requirements
- document source such as `CLIENT`, `OFFICE`, `PROFESSIONAL`, or `PHYSICAL`

A document requirement does **not** imply that a client must upload the document. This is important for workflows where supporting documents are submitted as physical hardcopies at an office.

## Future OBO usage

A future OBO module can use the same form engine for building, electrical, mechanical, plumbing, and other permit applications:

```text
modules/obo/
       │
       ├── permit-specific application model
       └── platform/forms
                ├── sections
                ├── fields
                ├── options
                └── validation
```

For example, a permit form may contain owner/applicant information, construction location, scope of work, occupancy classification, and conditional fields. Those form definitions belong to the OBO module/configuration, while field storage, validation, versioning, and rendering metadata remain platform responsibilities.

Physical professional signing of hardcopy documents remains an offline business process and is not modeled as a form-signing feature.

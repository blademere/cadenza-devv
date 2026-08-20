# Dynamic Forms Platform

The forms platform makes business forms configuration-driven while keeping execution and validation in application code. Forms are a platform mechanism; the consuming module or feature owns the meaning of submitted data.

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

Visibility rules are declarative JSON and support `all`, `any`, and `not` groups. Hidden fields are not required and are not validated.

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

Use normal domain columns and relations for stable concepts such as:

- person identity
- case relationships
- participant relationships
- permit type
- professional registration
- workflow state

Use dynamic fields for genuinely variable attributes such as configurable classifications, optional measurements, or organization-specific metadata.

## Form ownership

The form engine is generic. Domain modules define which forms apply to their business entities.

For OBO permit types, the current data model links `OboPermitType` to the generic platform `Form` through `formId`. Permit-specific fields therefore live in the form definition rather than in a separate custom-field subsystem. The migration `20260820090000_link_obo_permit_types_to_forms` establishes this relationship.

A permit form can contain owner/applicant information, construction location, scope of work, occupancy classification, conditional fields, and other permit-specific values. The form engine owns field storage, validation, options, visibility, and versioning; OBO owns the meaning of the fields.

## Document requirements

Document requirements are reusable and can be attached to a form or workflow configuration. They support:

- required/optional documents
- allowed file types
- maximum size
- conditional requirements
- document source such as `CLIENT`, `OFFICE`, `PROFESSIONAL`, or `PHYSICAL`

A document requirement does not imply that a client must upload the document. This supports workflows where supporting documents are submitted as physical hardcopies at an office.

Professional signing of hardcopy documents remains an offline business process and is not modeled as an application form-signing feature.

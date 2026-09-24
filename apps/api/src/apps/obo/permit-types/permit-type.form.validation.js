import { z } from 'zod'

const formKey = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)

const professionalRole = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Z][A-Z0-9_]*$/, 'professionalRole must use an uppercase identifier.')

const oboProfessionalReferenceConfig = z.object({
  referenceType: z.literal('obo_professional'),
  professionalRole,
  multiple: z.boolean().optional(),
}).strict()

const option = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  label: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0).optional(),
  metadata: z.unknown().optional(),
}).strict()

const optionalValidation = z
  .array(z.record(z.string(), z.unknown()))
  .nullable()
  .optional()
  .transform((value) => value ?? undefined)

const optionalConfig = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional()
  .transform((value) => value ?? undefined)

const field = z.object({
  key: z.string().trim().min(1).max(128),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  type: z.enum(['text', 'textarea', 'email', 'phone', 'number', 'integer', 'boolean', 'date', 'datetime', 'select', 'multiselect', 'reference']),
  sortOrder: z.number().int().min(0).optional(),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  validation: optionalValidation,
  visibility: z.record(z.string(), z.unknown()).nullable().optional(),
  config: optionalConfig,
  sectionKey: z.string().trim().min(1).max(128).nullable().optional(),
  options: z.array(option).optional(),
}).strict()

const validateOboProfessionalReferenceFields = (fields, ctx) => {
  fields.forEach((field, index) => {
    if (field.type !== 'reference') return

    const parsed = oboProfessionalReferenceConfig.safeParse(field.config)
    if (parsed.success) return

    for (const issue of parsed.error.issues) {
      ctx.addIssue({
        ...issue,
        path: ['fields', index, 'config', ...issue.path],
      })
    }
  })
}

const section = z.object({
  key: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  visibility: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict()

const formDefinition = z.object({
  sections: z.array(section).default([]),
  fields: z.array(field).min(1),
}).strict().superRefine(({ fields }, ctx) => {
  validateOboProfessionalReferenceFields(fields, ctx)
})

const createPermitTypeFormValidator = async (req) => ({
  params: z.object({ permitTypeId: z.string().uuid() }).parse(req.params || {}),
  body: z.object({
    key: formKey,
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(1000).nullable().optional(),
    entityType: z.string().trim().max(100).nullable().optional(),
    sections: z.array(section).optional().default([]),
    fields: z.array(field).min(1),
  }).strict().superRefine(({ fields }, ctx) => {
    validateOboProfessionalReferenceFields(fields, ctx)
  }).parse(req.body || {}),
})

const createPermitTypeFormVersionValidator = async (req) => ({
  params: z.object({ permitTypeId: z.string().uuid() }).parse(req.params || {}),
  body: formDefinition.parse(req.body || {}),
})

const updatePermitTypeFormVersionValidator = async (req) => ({
  params: z.object({
    permitTypeId: z.string().uuid(),
    version: z.coerce.number().int().positive(),
  }).parse(req.params || {}),
  body: formDefinition.parse(req.body || {}),
})

const publishPermitTypeFormVersionValidator = async (req) => ({
  params: z.object({
    permitTypeId: z.string().uuid(),
    version: z.coerce.number().int().positive(),
  }).parse(req.params || {}),
})

export {
  createPermitTypeFormValidator,
  createPermitTypeFormVersionValidator,
  updatePermitTypeFormVersionValidator,
  publishPermitTypeFormVersionValidator,
  oboProfessionalReferenceConfig,
}

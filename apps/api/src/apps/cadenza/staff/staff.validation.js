import { z } from 'zod'

const staffType = z.enum(['STAFF', 'FRONT_DESK', 'MANAGER', 'INSTRUCTOR'])
const status = z.enum(['ACTIVE', 'INACTIVE'])
const idParamsValidator = z.object({ params: z.object({ id: z.string().uuid() }) })
const createStaffValidator = z.object({
  body: z.object({
    personId: z.string().uuid(),
    staffType: staffType.default('STAFF'),
    status: status.default('ACTIVE'),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
})
const updateStaffValidator = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    staffType: staffType.optional(),
    status: status.optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' }),
})

export { idParamsValidator, createStaffValidator, updateStaffValidator }

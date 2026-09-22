import { z } from 'zod'

const id = z.string().uuid()
const rule = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
})
const instructorParamsValidator = z.object({ params: z.object({ instructorId: id }) })
const replaceValidator = z.object({ params: z.object({ instructorId: id }), body: z.object({ rules: z.array(rule).max(28) }) })
const blockValidator = z.object({ params: z.object({ instructorId: id }), body: z.object({ startsAt: z.coerce.date(), endsAt: z.coerce.date(), reason: z.string().trim().max(500).optional().nullable() }) })
const blockParamsValidator = z.object({ params: z.object({ instructorId: id, blockId: id }) })

export { instructorParamsValidator, replaceValidator, blockValidator, blockParamsValidator }

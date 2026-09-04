import { z } from 'zod'

const dateRange = ({ fromKey = 'from', toKey = 'to' } = {}) =>
  z.object({}).passthrough().superRefine((value, ctx) => {
    const from = value[fromKey]
    const to = value[toKey]

    if (from == null || to == null) return
    if (!(from instanceof Date) || !(to instanceof Date)) return

    if (from >= to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [toKey],
        message: `${toKey} must be after ${fromKey}`,
      })
    }
  })

export { dateRange }

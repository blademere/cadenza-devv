import { z } from 'zod'

const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'action', 'entityType']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    entityType: z.string().trim().min(1).max(100).optional(),
    entityId: z.string().trim().min(1).max(200).optional(),
    actorId: z.coerce.number().int().positive().optional(),
    action: z.string().trim().min(1).max(100).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }),
})

const timelineSchema = z.object({
  params: z.object({
    entityType: z.string().trim().min(1).max(100),
    entityId: z.string().trim().min(1).max(200),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
})

const listAuditLogsValidator = async (req) =>
  listAuditLogsSchema.parse({ query: req.query || {} })
const timelineValidator = async (req) =>
  timelineSchema.parse({
    params: req.params || {},
    query: req.query || {},
  })

export { listAuditLogsValidator, timelineValidator }

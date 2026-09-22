import { z } from 'zod'
const money = z.union([z.number().finite().positive(), z.string().trim().regex(/^\d+(?:\.\d+)?$/, 'must be a positive decimal amount')])
const packageUpdateValidator = z.object({ params: z.object({ lessonPackageId: z.string().uuid() }), body: z.object({ name: z.string().trim().min(1).optional(), description: z.string().trim().max(2000).nullable().optional(), price: money.optional(), numberOfSessions: z.coerce.number().int().positive().optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional() }) })
const packageValidator = z.object({ body: z.object({ name: z.string().trim().min(1), description: z.string().trim().max(2000).optional(), price: money, numberOfSessions: z.coerce.number().int().positive() }) })
const attachmentValidator = z.object({ body: z.object({ fileName: z.string().trim().min(1).max(255), contentBase64: z.string().min(1).max(1_300_000), contentType: z.string().trim().min(1).max(255), type: z.string().trim().min(1).max(100), metadata: z.record(z.any()).optional() }) })
const enrollmentValidator = z.object({ body: z.object({ studentId: z.string().uuid().optional(), lessonPackageId: z.string().uuid(), currency: z.string().length(3).default('PHP') }) })
const sessionValidator = z.object({ body: z.object({ enrollmentId: z.string().uuid(), instructorId: z.string().uuid().optional(), roomId: z.string().uuid().optional(), scheduledStart: z.string().datetime(), scheduledEnd: z.string().datetime() }) })
const attendanceValidator = z.object({ body: z.object({ status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']), notes: z.string().trim().max(2000).optional() }) })
const rescheduleValidator = z.object({ body: z.object({ sessionId: z.string().uuid(), requestedStart: z.string().datetime(), requestedEnd: z.string().datetime(), reason: z.string().trim().max(2000).optional() }) })
const reviewRescheduleValidator = z.object({ body: z.object({ approve: z.boolean() }) })
export { packageValidator, packageUpdateValidator, attachmentValidator, enrollmentValidator, sessionValidator, attendanceValidator, rescheduleValidator, reviewRescheduleValidator }

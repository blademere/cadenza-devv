import {z} from 'zod'
const packageValidator=z.object({body:z.object({name:z.string().trim().min(1),description:z.string().trim().max(2000).optional(),price:z.coerce.number().positive(),numberOfSessions:z.coerce.number().int().positive()})})
const attachmentValidator=z.object({body:z.object({storageReference:z.string().trim().min(1),type:z.string().trim().min(1),metadata:z.record(z.any()).optional()})})
const enrollmentValidator=z.object({body:z.object({studentId:z.string().uuid(),lessonPackageId:z.string().uuid(),currency:z.string().length(3).default('PHP')})})
const sessionValidator=z.object({body:z.object({enrollmentId:z.string().uuid(),instructorId:z.string().uuid().optional(),roomId:z.string().uuid().optional(),scheduledStart:z.string().datetime(),scheduledEnd:z.string().datetime()})})
const attendanceValidator=z.object({body:z.object({status:z.enum(['PRESENT','ABSENT','LATE','EXCUSED']),markedByUserId:z.coerce.number().int().positive().optional(),notes:z.string().trim().max(2000).optional()})})
const rescheduleValidator=z.object({body:z.object({sessionId:z.string().uuid(),requestedByUserId:z.coerce.number().int().positive(),requestedStart:z.string().datetime(),requestedEnd:z.string().datetime(),reason:z.string().trim().max(2000).optional()})})
const reviewRescheduleValidator=z.object({body:z.object({approve:z.boolean(),reviewedByUserId:z.coerce.number().int().positive()})})
export {packageValidator,attachmentValidator,enrollmentValidator,sessionValidator,attendanceValidator,rescheduleValidator,reviewRescheduleValidator}

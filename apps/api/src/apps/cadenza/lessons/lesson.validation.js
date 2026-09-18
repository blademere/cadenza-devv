import {z} from 'zod'
const packageValidator=z.object({body:z.object({name:z.string().trim().min(1),description:z.string().trim().max(2000).optional(),price:z.coerce.number().positive(),numberOfSessions:z.coerce.number().int().positive()})})
const attachmentValidator=z.object({body:z.object({fileName:z.string().trim().min(1).max(255),contentBase64:z.string().min(1).max(14_000_000),contentType:z.string().trim().min(1).max(255),type:z.string().trim().min(1).max(100),metadata:z.record(z.any()).optional()})})
const enrollmentValidator=z.object({body:z.object({studentId:z.string().uuid(),lessonPackageId:z.string().uuid(),currency:z.string().length(3).default('PHP')})})
const sessionValidator=z.object({body:z.object({enrollmentId:z.string().uuid(),instructorId:z.string().uuid().optional(),roomId:z.string().uuid().optional(),scheduledStart:z.string().datetime(),scheduledEnd:z.string().datetime()})})
const attendanceValidator=z.object({body:z.object({status:z.enum(['PRESENT','ABSENT','LATE','EXCUSED']),notes:z.string().trim().max(2000).optional()})})
const rescheduleValidator=z.object({body:z.object({sessionId:z.string().uuid(),requestedStart:z.string().datetime(),requestedEnd:z.string().datetime(),reason:z.string().trim().max(2000).optional()})})
const reviewRescheduleValidator=z.object({body:z.object({approve:z.boolean()})})
export {packageValidator,attachmentValidator,enrollmentValidator,sessionValidator,attendanceValidator,rescheduleValidator,reviewRescheduleValidator}

import {z} from 'zod'
const packageValidator=z.object({body:z.object({name:z.string().trim().min(1),description:z.string().trim().max(2000).optional(),price:z.coerce.number().positive(),numberOfSessions:z.coerce.number().int().positive()})})
const enrollmentValidator=z.object({body:z.object({studentId:z.string().uuid(),lessonPackageId:z.string().uuid(),currency:z.string().length(3).default('PHP')})})
const sessionValidator=z.object({body:z.object({enrollmentId:z.string().uuid(),instructorId:z.string().uuid().optional(),roomId:z.string().uuid().optional(),scheduledStart:z.string().datetime(),scheduledEnd:z.string().datetime()})})
export {packageValidator,enrollmentValidator,sessionValidator}

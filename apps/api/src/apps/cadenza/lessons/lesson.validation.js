import {z} from 'zod'
const packageValidator=z.object({body:z.object({name:z.string().trim().min(1).max(255),description:z.string().trim().max(2000).optional(),price:z.coerce.number().positive(),numberOfSessions:z.coerce.number().int().positive()})})
const enrollmentValidator=z.object({body:z.object({studentId:z.string().uuid(),lessonPackageId:z.string().uuid(),currency:z.string().trim().length(3).default('PHP')})})
export {packageValidator,enrollmentValidator}

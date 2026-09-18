import { z } from 'zod'
const createValidator=z.object({body:z.object({personId:z.string().uuid()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,idValidator}

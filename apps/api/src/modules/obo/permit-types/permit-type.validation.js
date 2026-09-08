import { z } from 'zod'

const permitTypeKey = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)

const permitTypeFields = {
  key: permitTypeKey,
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).nullable().optional(),
}

const permitTypeIdValidator = async (req) => ({
  params: z.object({ permitTypeId: z.string().uuid() }).parse(req.params || {}),
})

const createPermitTypeValidator = async (req) => ({
  body: z.object(permitTypeFields).strict().parse(req.body || {}),
})

const updatePermitTypeValidator = async (req) => ({
  params: z.object({ permitTypeId: z.string().uuid() }).parse(req.params || {}),
  body: z.object(permitTypeFields).partial().strict().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'At least one permit type field must be provided.' }
  ).parse(req.body || {}),
})

export {
  permitTypeIdValidator,
  createPermitTypeValidator,
  updatePermitTypeValidator,
}

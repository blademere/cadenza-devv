import { z } from 'zod'

const uuid = z.string().uuid()
const applicationParams = z.object({ id: uuid })
const formValues = z.record(z.string(), z.unknown())

const createApplicationValidator = async (req) => ({
  body: z.object({
    permitTypeId: uuid,
    formVersionId: uuid.optional(),
    formValues,
    replacesApplicationId: uuid.optional(),
  }).strict().parse(req.body || {}),
})

const updateApplicationValidator = async (req) => ({
  params: applicationParams,
  body: z.object({
    formVersionId: uuid.optional(),
    formValues,
  }).strict().parse(req.body || {}),
})

const applicationParamsValidator = async () => ({ params: applicationParams })

const submissionAppointmentValidator = async (req) => ({
  params: applicationParams,
  body: z.object({
    appointmentTypeId: uuid,
    slotId: uuid,
    notes: z.string().trim().max(2000).optional(),
  }).parse(req.body || {}),
})

export { createApplicationValidator, updateApplicationValidator, applicationParamsValidator, submissionAppointmentValidator }

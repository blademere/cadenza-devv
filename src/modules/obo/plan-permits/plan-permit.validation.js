const { z } = require('zod')
const uuid = z.string().uuid()
const applicationParams = z.object({ id: uuid })

const createApplicationValidator = async (req) => ({
  body: z.object({
    permitTypeId: uuid,
    professionalId: uuid,
    formVersionId: uuid.optional(),
    formValues: z.record(z.string(), z.unknown()),
  }).parse(req.body || {}),
})

const updateApplicationValidator = async (req) => ({
  params: applicationParams,
  body: z.object({
    professionalId: uuid.optional(),
    formVersionId: uuid.optional(),
    formValues: z.record(z.string(), z.unknown()),
  }).parse(req.body || {}),
})

const applicationParamsValidator = async (req) => ({ params: applicationParams })

const submissionAppointmentValidator = async (req) => ({
  params: applicationParams,
  body: z.object({
    appointmentTypeId: uuid,
    slotId: uuid,
    notes: z.string().trim().max(2000).optional(),
  }).parse(req.body || {}),
})

module.exports = {
  createApplicationValidator,
  updateApplicationValidator,
  applicationParamsValidator,
  submissionAppointmentValidator,
}

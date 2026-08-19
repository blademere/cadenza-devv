const { z } = require('zod')
const uuid = z.string().uuid()
const applicationParams = z.object({ id: uuid })
const createProfessionalValidator = async (req) => ({
  body: z
    .object({
      personId: uuid,
      registrationNumber: z.string().trim().min(1).max(100),
    })
    .parse(req.body || {}),
})
const verifyProfessionalValidator = async (req) => ({
  params: applicationParams,
  body: z
    .object({
      decision: z.enum(['ACCEPTED', 'DECLINED']),
      reason: z.string().trim().max(2000).optional(),
    })
    .parse(req.body || {}),
})
const createApplicationValidator = async (req) => ({
  body: z
    .object({
      permitTypeId: uuid,
      professionalId: uuid,
      formVersionId: uuid.optional(),
      formValues: z.record(z.string(), z.unknown()),
    })
    .parse(req.body || {}),
})
const applicationValidator = async () => ({ params: applicationParams })
const receivingListValidator = async (req) => ({
  query: z
    .object({
      status: z
        .enum(['SUBMISSION_SCHEDULED', 'SUBMITTED', 'FOR_RECEIVING_REVIEW'])
        .optional(),
    })
    .parse(req.query || {}),
})
const submissionAppointmentValidator = async (req) => ({
  params: applicationParams,
  body: z
    .object({
      appointmentTypeId: uuid,
      slotId: uuid,
      notes: z.string().trim().max(2000).optional(),
    })
    .parse(req.body || {}),
})
const receivingDecisionValidator = async (req) => ({
  params: applicationParams,
  body: z
    .object({
      decision: z.enum(['ACCEPTED', 'DECLINED']),
      reason: z.string().trim().max(2000).optional(),
    })
    .parse(req.body || {}),
})
module.exports = {
  createProfessionalValidator,
  verifyProfessionalValidator,
  createApplicationValidator,
  applicationValidator,
  receivingListValidator,
  submissionAppointmentValidator,
  receivingDecisionValidator,
}

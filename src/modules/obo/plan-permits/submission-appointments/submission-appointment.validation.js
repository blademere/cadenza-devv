const { z } = require('zod')

const applicationIdValidator = {
  params: z.object({
    applicationId: z.coerce.number().int().positive(),
  }),
}

const createSubmissionAppointmentValidator = {
  params: applicationIdValidator.params,
  body: z.object({
    appointmentTypeId: z.coerce.number().int().positive(),
    slotId: z.coerce.number().int().positive(),
  }).strict(),
}

const submissionAppointmentIdValidator = {
  params: z.object({
    applicationId: z.coerce.number().int().positive(),
    appointmentId: z.coerce.number().int().positive(),
  }),
}

module.exports = {
  applicationIdValidator,
  createSubmissionAppointmentValidator,
  submissionAppointmentIdValidator,
}

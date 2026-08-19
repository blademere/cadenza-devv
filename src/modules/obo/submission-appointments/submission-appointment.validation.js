const { z } = require('zod')

const uuid = z.string().uuid()

const applicationParamsValidator = {
  params: z.object({ applicationId: uuid }),
}

const createSubmissionAppointmentValidator = {
  params: applicationParamsValidator.params,
  body: z.object({
    appointmentTypeId: uuid,
    slotId: uuid,
    notes: z.string().trim().max(2000).optional(),
  }).strict(),
}

module.exports = { applicationParamsValidator, createSubmissionAppointmentValidator }

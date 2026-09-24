import { z } from 'zod'

const uuid = z.string().uuid()
const applicationParams = z.object({ applicationId: uuid }).strict()
const createSubmissionAppointmentBody = z.object({
  appointmentTypeId: uuid,
  slotId: uuid,
  notes: z.string().trim().max(2000).optional(),
}).strict()

const applicationParamsValidator = async (req) => ({
  params: applicationParams.parse(req.params),
})

const createSubmissionAppointmentValidator = async (req) => ({
  params: applicationParams.parse(req.params),
  body: createSubmissionAppointmentBody.parse(req.body || {}),
})

const replaceSubmissionAppointmentValidator = async (req) => ({
  params: applicationParams.parse(req.params),
  body: createSubmissionAppointmentBody.parse(req.body || {}),
})

export { applicationParamsValidator, createSubmissionAppointmentValidator, replaceSubmissionAppointmentValidator }

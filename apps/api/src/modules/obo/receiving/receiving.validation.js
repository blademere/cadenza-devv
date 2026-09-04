import { z } from 'zod'

const uuid = z.string().uuid()
const receivingStatuses = ['SUBMISSION_SCHEDULED', 'RECEIVING', 'DECLINED', 'FOR_INSPECTION']

const applicationParamsValidator = async (req) => ({
  params: z.object({ id: uuid }).parse(req.params),
})

const listValidator = async (req) => ({
  query: z.object({
    status: z.enum(receivingStatuses).optional(),
  }).parse(req.query || {}),
})

const decisionValidator = async (req) => ({
  params: z.object({ id: uuid }).parse(req.params),
  body: z.object({
    decision: z.enum(['ACCEPTED', 'DECLINED']),
    reason: z.string().trim().max(2000).optional(),
  }).parse(req.body || {}),
})

export { applicationParamsValidator, listValidator, decisionValidator }

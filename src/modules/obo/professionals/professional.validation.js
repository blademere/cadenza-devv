const { z } = require('zod')

const id = z.string().uuid()
const applyValidator = async (req) => ({
  body: z.object({
    registrationNumber: z.string().trim().min(1).max(100),
  }).parse(req.body || {}),
})
const decisionValidator = async (req) => ({
  params: z.object({ id }),
  body: z.object({
    decision: z.enum(['ACCEPTED', 'DECLINED']),
    reason: z.string().trim().max(2000).optional(),
  }).parse(req.body || {}),
})

module.exports = { applyValidator, decisionValidator }

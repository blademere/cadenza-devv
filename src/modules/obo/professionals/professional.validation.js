const { z } = require('zod')

const id = z.string().uuid()
const credential = (name) => z.string().trim().min(1, `${name} is required.`).max(100)

const applyValidator = async (req) => ({
  body: z.object({
    registrationNumber: credential('registrationNumber'),
    prcId: credential('prcId'),
    ptrNumber: credential('ptrNumber'),
  }).parse(req.body || {}),
})
const decisionValidator = async (req) => ({
  params: z.object({ id }),
  body: z.object({
    decision: z.enum(['ACCEPTED', 'DECLINED']),
    reason: z.string().trim().max(2000).optional(),
  }).superRefine((value, ctx) => {
    if (value.decision === 'DECLINED' && !value.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'A reason is required when declining a professional verification application.' })
    }
  }).parse(req.body || {}),
})

module.exports = { applyValidator, decisionValidator }

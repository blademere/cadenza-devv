import { z } from 'zod'
const uuid = z.string().uuid()
const listValidator = async (req) => ({ query: z.object({ status: z.literal('SUBMISSION_SCHEDULED').optional() }).parse(req.query || {}) })
const decisionValidator = async (req) => ({ params: z.object({ id: uuid }), body: z.object({ decision: z.enum(['ACCEPTED', 'DECLINED']), reason: z.string().trim().max(2000).optional() }).parse(req.body || {}) })
export { listValidator, decisionValidator }

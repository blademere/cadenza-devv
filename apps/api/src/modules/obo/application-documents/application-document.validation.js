import { z } from 'zod'

const uuid = z.string().uuid()

const applicationDocumentsParamsValidator = async (req) => ({
  params: z.object({ id: uuid }).parse(req.params),
})

const updateDocumentReceiptValidator = async (req) => ({
  params: z.object({ id: uuid, requirementId: uuid }).parse(req.params),
  body: z.object({
    status: z.enum(['RECEIVED', 'REJECTED']),
    notes: z.string().trim().max(2000).optional(),
  }).parse(req.body || {}),
})

export { applicationDocumentsParamsValidator, updateDocumentReceiptValidator }

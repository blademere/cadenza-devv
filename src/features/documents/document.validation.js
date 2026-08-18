const { z } = require("zod")

const uploadDocumentValidator = {
  body: z.object({
    documentTypeId: z.string().uuid().optional(),
  }),
}

const documentIdValidator = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

module.exports = {
  uploadDocumentValidator,
  documentIdValidator,
}

const { z } = require("zod")

const documentIdValidator = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

const documentTypeIdValidator = z.string().uuid()

module.exports = {
  documentIdValidator,
  documentTypeIdValidator,
}

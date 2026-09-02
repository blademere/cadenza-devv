const { z } = require('zod')

const optionalText = (max) => z.string().trim().max(max).optional().nullable()

const registrationValidator = async (req) => ({
  body: z.object({
    firstName: z.string().trim().min(1).max(100),
    middleName: optionalText(100),
    lastName: z.string().trim().min(1).max(100),
    suffix: optionalText(30),
    email: z.email().trim().toLowerCase().optional().nullable(),
    phone: optionalText(30),
    address: z.record(z.string(), z.unknown()).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  }).strict().parse(req.body || {}),
})

module.exports = { registrationValidator }

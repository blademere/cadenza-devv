import { z } from 'zod'

const usageValidator = async (req) =>
  z.object({
    params: z.object({ id: z.string().trim().min(1) }),
  }).parse({ params: req.params })

export { usageValidator }

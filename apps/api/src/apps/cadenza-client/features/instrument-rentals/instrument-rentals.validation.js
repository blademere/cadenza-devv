import { z } from 'zod';

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
});

const updateSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
  body: z.object({
    rentalRate: z.coerce.number().positive().optional(),
    rentalDuration: z.coerce.number().int().positive().optional(),
  }),
});

const idValidator = async (req) =>
  idSchema.parse({
    params: req.params || {},
  });

const updateValidator = async (req) =>
  updateSchema.parse({
    params: req.params || {},
    body: req.body || {},
  });

export { idValidator, updateValidator };

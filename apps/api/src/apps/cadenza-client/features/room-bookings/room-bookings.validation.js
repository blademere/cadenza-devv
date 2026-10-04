import { z } from 'zod';

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
});

const scheduleSchema = z.object({
  query: z.object({
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
  }),
});

const createSchema = z.object({
  body: z.object({
    roomId: z.uuid(),
    paymentPlan: z.enum(['DOWN_PAYMENT', 'FULL_PAYMENT']).optional(),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
  }),
});

const cancelSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
  body: z.object({
    cancellationReason: z
      .string()
      .trim()
      .max(500)
      .optional(),
  }),
});

const idValidator = async (req) =>
  idSchema.parse({
    params: req.params || {},
  });

const scheduleValidator = async (req) =>
  scheduleSchema.parse({
    query: req.query || {},
  });

const createValidator = async (req) =>
  createSchema.parse({
    body: req.body || {},
  });

const cancelValidator = async (req) =>
  cancelSchema.parse({
    params: req.params || {},
    body: req.body || {},
  });

export {
  idValidator,
  scheduleValidator,
  createValidator,
  cancelValidator,
};

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

const walkInCreateSchema = z.object({
  body: z.object({
    customer: z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      phone: z.string().trim().min(3).max(50),
      email: z.string().trim().email().max(255).optional().or(z.literal('')),
    }),
    roomId: z.uuid(),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    paymentMethod: z.enum(['CASH', 'GCASH', 'CARD', 'OTHER']).optional(),
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

const checkInSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z.object({ checkedInAt: z.coerce.date() }),
});

const checkOutSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z.object({ checkedOutAt: z.coerce.date() }),
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

const walkInCreateValidator = async (req) =>
  walkInCreateSchema.parse({ body: req.body || {} });

const cancelValidator = async (req) =>
  cancelSchema.parse({
    params: req.params || {},
    body: req.body || {},
  });

const checkInValidator = async (req) =>
  checkInSchema.parse({ params: req.params || {}, body: req.body || {} });

const checkOutValidator = async (req) =>
  checkOutSchema.parse({ params: req.params || {}, body: req.body || {} });

export {
  idValidator,
  scheduleValidator,
  createValidator,
  walkInCreateValidator,
  cancelValidator,
  checkInValidator,
  checkOutValidator,
};

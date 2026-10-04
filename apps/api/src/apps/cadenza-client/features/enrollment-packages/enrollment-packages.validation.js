import { z } from 'zod';

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
});

const createSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(150),

    price: z.coerce
      .number()
      .positive(),

    numberOfSessions: z.coerce
      .number()
      .int()
      .positive(),

    sessionDurationMinutes: z.coerce
      .number()
      .int()
      .positive(),

    sessionsPerWeek: z.coerce
      .number()
      .int()
      .positive(),

    status: z
      .enum([
        'ACTIVE',
        'INACTIVE',
      ])
      .optional(),
  }),
});

const updateSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),

  body: z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .optional(),

    price: z.coerce
      .number()
      .positive()
      .optional(),

    numberOfSessions: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    sessionDurationMinutes: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    sessionsPerWeek: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    status: z
      .enum([
        'ACTIVE',
        'INACTIVE',
      ])
      .optional(),
  }),
});

const idValidator = async (req) =>
  idSchema.parse({
    params: req.params || {},
  });

const createValidator = async (req) =>
  createSchema.parse({
    body: req.body || {},
  });

const updateValidator = async (req) =>
  updateSchema.parse({
    params: req.params || {},
    body: req.body || {},
  });

export {
  idValidator,
  createValidator,
  updateValidator,
};
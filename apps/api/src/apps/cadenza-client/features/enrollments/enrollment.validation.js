import { z } from 'zod';

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
});

const packageInstructorSchema = z.object({
  params: z.object({
    packageId: z.uuid(),
  }),
  query: z.object({
    courseId: z.uuid().optional(),
    startDate: z.coerce.date().optional(),
  }).default({}),
});

const packageInstructorAvailabilitySchema =
  z.object({
    params: z.object({
      packageId: z.uuid(),
      instructorId: z.uuid(),
    }),
    query: z.object({
      courseId: z.uuid().optional(),
      startDate: z.coerce.date().optional(),
    }).default({}),
  });

const sessionSchema = z.object({
  instructorId: z.uuid(),
  roomId: z.uuid().optional().nullable(),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createSchema = z.object({
  body: z.object({
    lessonPackageId: z.uuid(),

    sessions: z
      .array(sessionSchema)
      .min(1),

    paymentObligationId:
      z.uuid().optional().nullable(),

    paymentExpiresAt:
      z.coerce.date().optional().nullable(),

    metadata:
      z.record(z.string(), z.any()).optional(),
  }),
});

const idValidator = async (req) =>
  idSchema.parse({
    params: req.params || {},
  });

const packageInstructorValidator = async (req) =>
  packageInstructorSchema.parse({
    params: req.params || {},
    query: req.query || {},
  });

const packageInstructorAvailabilityValidator =
  async (req) =>
    packageInstructorAvailabilitySchema.parse({
    params: req.params || {},
    query: req.query || {},
  });

const createValidator = async (req) =>
  createSchema.parse({
    body: req.body || {},
  });

const validateScheduleValidator = createValidator;

export {
  idValidator,
  packageInstructorValidator,
  packageInstructorAvailabilityValidator,
  createValidator,
  validateScheduleValidator,
};

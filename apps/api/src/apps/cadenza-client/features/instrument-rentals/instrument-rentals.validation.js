import { z } from 'zod';

const idSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
});

const availabilitySchema = z.object({
  query: z.object({
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
  }),
});

const createRentalSchema = z.object({
  body: z.object({
    rentalType: z.enum(['INDIVIDUAL', 'PACKAGE']),
    instrumentId: z.uuid().optional(),
    instrumentIds: z.array(z.uuid()).min(1).optional(),
    rentalPackageId: z.uuid().optional(),
    paymentPlan: z.enum(['DOWN_PAYMENT', 'FULL_PAYMENT']).optional(),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
  }),
});

const cancelRentalSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
  body: z.object({
    cancellationReason: z.string().trim().max(500).optional(),
  }),
});

const idValidator = (req, res, next) => {
  try {
    const validated = idSchema.parse({
      params: req.params || {},
    });

    req.validated = req.validated || {};
    req.validated.params = validated.params;

    next();
  } catch (error) {
    next(error);
  }
};

const availabilityValidator = (req, res, next) => {
  try {
    const validated = availabilitySchema.parse({
      query: req.query || {},
    });

    req.validated = req.validated || {};
    req.validated.query = validated.query;

    next();
  } catch (error) {
    next(error);
  }
};

const createRentalValidator = (req, res, next) => {
  try {
    const validated = createRentalSchema.parse({
      body: req.body || {},
    });

    if (
      validated.body.rentalType === 'INDIVIDUAL' &&
      !validated.body.instrumentId &&
      !validated.body.instrumentIds?.length
    ) {
      throw new Error(
        'instrumentId is required for an individual rental.',
      );
    }

    if (
      validated.body.rentalType === 'PACKAGE' &&
      !validated.body.rentalPackageId
    ) {
      throw new Error(
        'rentalPackageId is required for a package rental.',
      );
    }

    req.validated = req.validated || {};
    req.validated.body = validated.body;

    next();
  } catch (error) {
    next(error);
  }
};

const cancelRentalValidator = (req, res, next) => {
  try {
    const validated = cancelRentalSchema.parse({
      params: req.params || {},
      body: req.body || {},
    });

    req.validated = req.validated || {};
    req.validated.params = validated.params;
    req.validated.body = validated.body;

    next();
  } catch (error) {
    next(error);
  }
};

export {
  idValidator,
  availabilityValidator,
  createRentalValidator,
  cancelRentalValidator,
};

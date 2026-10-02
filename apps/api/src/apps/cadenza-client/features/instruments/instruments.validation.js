import { z } from 'zod';

const rentalRateSchema = z
  .union([
    z.number().finite().nonnegative(),
    z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' ||
          Number.isFinite(Number(value)),
        'Rental rate must be a valid amount.',
      ),
  ])
  .optional()
  .nullable();

export const createInstrumentValidator = (req, res, next) => {
  const body = req.body ?? {};

  req.validated = {
    ...(req.validated ?? {}),
    body: {
      ...body,
      rentalRate:
        body.rentalRate === ''
          ? null
          : body.rentalRate,
    },
  };

  next();
};
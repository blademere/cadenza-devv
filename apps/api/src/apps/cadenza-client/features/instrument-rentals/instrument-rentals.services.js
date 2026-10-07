import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { instrumentRentalsRepository } from './instrument-rentals.repository.js';

// Individual instrument rates represent the minimum charge for this period.
const MINIMUM_RENTAL_HOURS = 8;

const validateSchedule = (scheduledStart, scheduledEnd) => {
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestError(
      'scheduledStart and scheduledEnd must be valid dates.',
    );
  }

  if (end <= start) {
    throw new BadRequestError(
      'scheduledEnd must be later than scheduledStart.',
    );
  }

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  if (durationHours < MINIMUM_RENTAL_HOURS) {
    throw new BadRequestError(
      `The minimum rental period is ${MINIMUM_RENTAL_HOURS} hours.`,
    );
  }

  return {
    scheduledStart: start,
    scheduledEnd: end,
    durationHours,
  };
};

const getCustomerId = (req) => {
  if (!req.cadenzaCustomer?.id) {
    throw new BadRequestError('Authenticated Cadenza client is required.');
  }

  return req.cadenzaCustomer.id;
};

const normalizeRentalType = (rentalType) => {
  if (!['INDIVIDUAL', 'PACKAGE'].includes(rentalType)) {
    throw new BadRequestError('Invalid rental type.');
  }

  return rentalType;
};

export const instrumentRentalsService = {
  async getInstrumentRentals(appId) {
    return instrumentRentalsRepository.findAll(appId);
  },

  async getInstrumentRentalById(appId, id) {
    const rental = await instrumentRentalsRepository.findRentalById(appId, id);

    if (!rental) {
      throw new NotFoundError('Instrument rental not found.');
    }

    return rental;
  },

  async getAvailableInstruments(
    appId,
    scheduledStart = null,
    scheduledEnd = null,
  ) {
    const instruments =
      await instrumentRentalsRepository.findAvailableInstruments(appId);

    if (!scheduledStart || !scheduledEnd) {
      return instruments;
    }

    const schedule = validateSchedule(scheduledStart, scheduledEnd);

    const instrumentIds = instruments.map((instrument) => instrument.id);

    if (!instrumentIds.length) {
      return [];
    }

    const overlappingInstrumentIds =
      await instrumentRentalsRepository.findOverlappingInstrumentIds(
        appId,
        instrumentIds,
        schedule.scheduledStart,
        schedule.scheduledEnd,
      );

    const occupiedInstrumentIds = new Set(overlappingInstrumentIds);

    return instruments.filter(
      (instrument) => !occupiedInstrumentIds.has(instrument.id),
    );
  },

  async getAvailableInstrumentById(appId, id) {
    const instrument = await instrumentRentalsRepository.findInstrumentById(
      appId,
      id,
    );

    if (!instrument) {
      throw new NotFoundError('Instrument not found.');
    }

    if (instrument.status !== 'AVAILABLE') {
      throw new NotFoundError('Instrument is not available for rental.');
    }

    return instrument;
  },

  async getRentalPackages(appId) {
    return instrumentRentalsRepository.findActiveRentalPackages(appId);
  },

  async getRentalPackageById(appId, id) {
    const rentalPackage =
      await instrumentRentalsRepository.findRentalPackageById(appId, id);

    if (!rentalPackage) {
      throw new NotFoundError('Rental package not found.');
    }

    return rentalPackage;
  },

  async getMyInstrumentRentals(appId, customerId) {
    return instrumentRentalsRepository.findRentalsByCustomer(appId, customerId);
  },

  async getMyInstrumentRentalById(appId, customerId, id) {
    const rental = await instrumentRentalsRepository.findRentalById(
      appId,
      id,
      customerId,
    );

    if (!rental) {
      throw new NotFoundError('Instrument rental not found.');
    }

    return rental;
  },

  async createInstrumentRental({
    appId,
    customerId,
    rentalType,
    instrumentId,
    instrumentIds,
    rentalPackageId,
    paymentPlan,
    scheduledStart,
    scheduledEnd,
  }) {
    const schedule = validateSchedule(scheduledStart, scheduledEnd);

    const normalizedRentalType = normalizeRentalType(rentalType);

    const customer = await instrumentRentalsRepository.findCustomerById(
      appId,
      customerId,
    );

    if (!customer) {
      throw new NotFoundError('Customer not found.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestError('Customer is not active.');
    }

    if (normalizedRentalType === 'INDIVIDUAL') {
      return this.createIndividualRental({
        appId,
        customerId,
        instrumentId,
        instrumentIds,
        paymentPlan,
        schedule,
      });
    }

    return this.createPackageRental({
      appId,
      customerId,
      rentalPackageId,
      schedule,
    });
  },

  async createIndividualRental({
    appId,
    customerId,
    instrumentId,
    instrumentIds,
    paymentPlan,
    schedule,
  }) {
    const selectedPaymentPlan = paymentPlan || 'FULL_PAYMENT';
    const selectedInstrumentIds = [
      ...(Array.isArray(instrumentIds) ? instrumentIds : []),
      ...(instrumentId ? [instrumentId] : []),
    ].filter((id, index, ids) => ids.indexOf(id) === index);

    if (!selectedInstrumentIds.length) {
      throw new BadRequestError(
        'At least one instrument is required for an individual rental.',
      );
    }

    const instruments = await Promise.all(
      selectedInstrumentIds.map((id) =>
        instrumentRentalsRepository.findInstrumentById(appId, id),
      ),
    );

    if (instruments.some((instrument) => !instrument)) {
      throw new NotFoundError('One or more instruments were not found.');
    }

    const unavailableInstrument = instruments.find(
      (instrument) => instrument.status !== 'AVAILABLE',
    );

    if (unavailableInstrument) {
      throw new ConflictError(
        'One or more selected instruments are not available.',
      );
    }

    const overlappingInstrumentIds =
      await instrumentRentalsRepository.findOverlappingInstrumentIds(
        appId,
        selectedInstrumentIds,
        schedule.scheduledStart,
        schedule.scheduledEnd,
      );

    if (overlappingInstrumentIds.length) {
      throw new ConflictError(
        'One or more selected instruments are already rented during the selected period.',
      );
    }

    const rentalRate = instruments.reduce(
      (total, instrument) =>
        total + Number(instrument.rentalRate ?? 0),
      0,
    );

    if (instruments.some((instrument) => instrument.rentalRate === null)) {
      throw new BadRequestError(
        'Every selected instrument must have an individual rental rate configured.',
      );
    }

    const billableHours = Math.max(
      MINIMUM_RENTAL_HOURS,
      Math.ceil(schedule.durationHours),
    );

    const totalAmount =
      (rentalRate / MINIMUM_RENTAL_HOURS) * billableHours;

    const initialPaymentAmount =
      selectedPaymentPlan === 'DOWN_PAYMENT'
        ? totalAmount * 0.5
        : totalAmount;

    const rental = await instrumentRentalsRepository.createRental({
      appId,
      customerId,
      rentalPackageId: null,
      rentalType: 'INDIVIDUAL',
      scheduledStart: schedule.scheduledStart,
      scheduledEnd: schedule.scheduledEnd,
      totalAmount,
      refundableDeposit: 0,
      status: 'FOR_APPROVAL',
      metadata: {
        paymentPlan: selectedPaymentPlan,
        paymentMethod: 'QR_PLACEHOLDER',
        paymentStatus:
          selectedPaymentPlan === 'DOWN_PAYMENT'
            ? 'PARTIALLY_PAID'
            : 'PAID',
        paymentCompletedAt: new Date().toISOString(),
        initialPaymentAmount,
        remainingAmount: totalAmount - initialPaymentAmount,
      },
    });

    await instrumentRentalsRepository.createRentalItems(
      instruments.map((instrument) => ({
        appId,
        rentalId: rental.id,
        instrumentId: instrument.id,
      })),
    );

    return instrumentRentalsRepository.findRentalById(
      appId,
      rental.id,
      customerId,
    );
  },

  async createPackageRental({ appId, customerId, rentalPackageId, schedule }) {
    if (!rentalPackageId) {
      throw new BadRequestError(
        'Rental package is required for a package rental.',
      );
    }

    const rentalPackage =
      await instrumentRentalsRepository.findRentalPackageById(
        appId,
        rentalPackageId,
      );

    if (!rentalPackage) {
      throw new NotFoundError('Rental package not found.');
    }

    if (rentalPackage.status !== 'ACTIVE') {
      throw new ConflictError('The selected rental package is not active.');
    }

    if (schedule.durationHours < rentalPackage.rentalHours) {
      throw new BadRequestError(
        `The minimum rental period for this package is ${rentalPackage.rentalHours} hours.`,
      );
    }

    const requiredQuantity = rentalPackage.items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    );

    const availableInstruments =
      await instrumentRentalsRepository.findAvailableInstruments(appId);

    const availableInstrumentIds = availableInstruments.map(
      (instrument) => instrument.id,
    );

    const overlappingInstrumentIds =
      await instrumentRentalsRepository.findOverlappingInstrumentIds(
        appId,
        availableInstrumentIds,
        schedule.scheduledStart,
        schedule.scheduledEnd,
      );

    const occupiedIds = new Set(overlappingInstrumentIds);

    const freeInstruments = availableInstruments.filter(
      (instrument) => !occupiedIds.has(instrument.id),
    );

    const selectedInstruments = [];

    if (freeInstruments.length < requiredQuantity) {
      throw new ConflictError(
        'Not enough available instruments for the selected package.',
      );
    }

    selectedInstruments.push(...freeInstruments.slice(0, requiredQuantity));

    const rental = await instrumentRentalsRepository.createRental({
      appId,
      customerId,
      rentalPackageId: rentalPackage.id,
      rentalType: 'PACKAGE',
      scheduledStart: schedule.scheduledStart,
      scheduledEnd: schedule.scheduledEnd,
      totalAmount: rentalPackage.rentalRate,
      refundableDeposit: rentalPackage.depositAmount,
      status: 'FOR_APPROVAL',
    });

    await instrumentRentalsRepository.createRentalItems(
      selectedInstruments.map((instrument) => ({
        appId,
        rentalId: rental.id,
        instrumentId: instrument.id,
      })),
    );

    return instrumentRentalsRepository.findRentalById(
      appId,
      rental.id,
      customerId,
    );
  },

  async cancelInstrumentRental({ appId, customerId, id, cancellationReason }) {
    const rental = await instrumentRentalsRepository.findRentalById(
      appId,
      id,
      customerId,
    );

    if (!rental) {
      throw new NotFoundError('Instrument rental not found.');
    }

    if (rental.status === 'CANCELLED') {
      throw new BadRequestError('Instrument rental is already cancelled.');
    }

    if (rental.status === 'COMPLETED') {
      throw new BadRequestError(
        'Completed instrument rentals cannot be cancelled.',
      );
    }

    const result = await instrumentRentalsRepository.cancelRental(
      appId,
      customerId,
      id,
      {
        status: 'CANCELLED',
        metadata: {
          ...(rental.metadata || {}),
          cancellationReason: cancellationReason?.trim() || null,
        },
      },
    );

    if (result.count !== 1) {
      throw new ConflictError(
        'Instrument rental was modified or no longer exists.',
      );
    }

    return instrumentRentalsRepository.findRentalById(appId, id, customerId);
  },
};

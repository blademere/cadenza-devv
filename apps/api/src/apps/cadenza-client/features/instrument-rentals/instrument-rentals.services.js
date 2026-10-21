import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { instrumentRentalsRepository } from './instrument-rentals.repository.js';
import {
  assertRentalStartWithinOperatingHours,
  getOperationalEnd,
  getOperationalMinutesBetween,
} from '../settings/operating-hours.js';
import { settingsService } from '../settings/settings.service.js';
import { createWalkInCustomer } from '../walk-ins/walk-in-customer.service.js';

// Individual instrument rates represent the minimum charge for this period.
const MINIMUM_RENTAL_HOURS = 8;
const RETURN_CONDITIONS = [
  { value: 'GOOD', label: 'Good condition', damageFee: 0 },
  { value: 'MINOR_DAMAGE', label: 'Minor damage', damageFee: 500 },
  { value: 'MAJOR_DAMAGE', label: 'Major damage', damageFee: 1500 },
  { value: 'LOST', label: 'Lost / not returned', damageFee: 5000 },
];

const calculateExcessCharge = (rental, returnedAt, operatingHours) => {
  const expectedReturnAt = new Date(rental.scheduledEnd);
  const operationalEnd = getOperationalEnd(operatingHours, expectedReturnAt);
  const billableReturnedAt = operationalEnd && returnedAt > operationalEnd ? operationalEnd : returnedAt;
  const lateMinutes = Math.max(
    0,
    Math.ceil((billableReturnedAt.getTime() - expectedReturnAt.getTime()) / (1000 * 60)),
  );
  const excessHours = lateMinutes > 0 ? Math.ceil(lateMinutes / 60) : 0;
  const instrumentRate = (rental.items || []).reduce(
    (total, item) => total + Number(item.instrument?.rentalRate || 0),
    0,
  );
  const hourlyRate = instrumentRate / MINIMUM_RENTAL_HOURS;

  return {
    expectedReturnAt,
    lateMinutes,
    excessHours,
    hourlyRate,
    excessCharge: excessHours * hourlyRate,
  };
};

const validateSchedule = (scheduledStart, scheduledEnd, operatingHours = null) => {
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

  const durationHours = operatingHours
    ? getOperationalMinutesBetween(operatingHours, start, end) / 60
    : (end.getTime() - start.getTime()) / (1000 * 60 * 60);

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

const manilaDateKey = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

const assertWalkInDateWindow = (scheduledStart) => {
  const today = manilaDateKey(new Date());
  const startDate = manilaDateKey(scheduledStart);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  if (startMs <= todayMs || startMs > todayMs + 5 * 24 * 60 * 60 * 1000) {
    throw new BadRequestError('Walk-in rentals are only allowed from tomorrow through the next 5 days.');
  }
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
  getReturnConditions() {
    return RETURN_CONDITIONS;
  },

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

  async approveInstrumentRental(appId, id) {
    const rentals = await instrumentRentalsRepository.findAll(appId);
    const rental = rentals.find(
      (item) =>
        item.id === id &&
        [
          'FOR_APPROVAL',
          'PENDING',
          'PENDING_PAYMENT',
          'PENDING_CONFIRMATION',
          'PARTIALLY_PAID',
        ].includes(item.status),
    );

    if (!rental) {
      throw new NotFoundError('Instrument rental waiting for approval was not found.');
    }

    const metadata = rental.metadata || {};
    const paymentPlan = metadata.paymentPlan === 'DOWN_PAYMENT'
      ? 'DOWN_PAYMENT'
      : 'FULL_PAYMENT';
    const totalAmount = Number(rental.totalAmount || 0);
    const initialPaymentAmount = Number(
      metadata.initialPaymentAmount ||
        (paymentPlan === 'DOWN_PAYMENT' ? totalAmount * 0.5 : totalAmount),
    );
    const paymentContinuationRequired = paymentPlan === 'DOWN_PAYMENT';

    const approved = await instrumentRentalsRepository.updateStaffDecision(
      appId,
      id,
      {
        status: 'APPROVED',
        metadata: {
          ...metadata,
          approvalStatus: 'APPROVED',
          approvedAt: new Date().toISOString(),
          paymentContinuationRequired,
          paymentContinuationStatus: paymentContinuationRequired
            ? 'PENDING'
            : 'NOT_REQUIRED',
          remainingAmount: paymentContinuationRequired
            ? Math.max(totalAmount - initialPaymentAmount, 0)
            : 0,
        },
      },
    );

    if (!approved) {
      throw new ConflictError('This instrument rental has already been processed.');
    }

    return approved;
  },

  async returnInstrumentRental(appId, id, {
    returnedAt: requestedReturnedAt,
    condition,
    damageFee: requestedDamageFee,
  }) {
    const returnedAt = new Date(requestedReturnedAt || new Date());
    if (Number.isNaN(returnedAt.getTime())) {
      throw new BadRequestError('A valid return time is required.');
    }

    const selectedCondition = RETURN_CONDITIONS.find(
      (item) => item.value === condition,
    );
    if (!selectedCondition) {
      throw new BadRequestError('A valid instrument condition is required.');
    }

    const rentals = await instrumentRentalsRepository.findAll(appId);
    const rental = rentals.find((item) => item.id === id);

    if (!rental) {
      throw new NotFoundError('Instrument rental not found.');
    }

    if (rental.status === 'COMPLETED') {
      throw new BadRequestError('This instrument rental has already been returned.');
    }

    if (rental.status !== 'APPROVED') {
      throw new BadRequestError(
        'Only approved instrument rentals can be marked as returned.',
      );
    }

    if (!rental.metadata?.receivedAt) {
      throw new BadRequestError(
        'The instrument must be received before it can be returned.',
      );
    }

    if (returnedAt < new Date(rental.scheduledStart)) {
      throw new BadRequestError('Return time cannot be earlier than the rental start time.');
    }

    const operatingHours = await settingsService.getOperatingHours(appId);
    const excess = calculateExcessCharge(rental, returnedAt, operatingHours);
    const baseRentalAmount = Number(
      rental.metadata?.baseRentalAmount ?? rental.totalAmount ?? 0,
    );
    const totalAmount = baseRentalAmount + excess.excessCharge;
    const damageCharge = Number(requestedDamageFee);

    const returned = await instrumentRentalsRepository.returnRental(
      appId,
      id,
      {
        status: 'COMPLETED',
        returnedAt,
        totalAmount: totalAmount + damageCharge,
        metadata: {
          ...(rental.metadata || {}),
          returnStatus: 'RETURNED',
          returnedAt: returnedAt.toISOString(),
          expectedReturnAt: excess.expectedReturnAt.toISOString(),
          baseRentalAmount,
          excessHours: excess.excessHours,
          excessCharge: excess.excessCharge,
          excessHourlyRate: excess.hourlyRate,
          lateMinutes: excess.lateMinutes,
          returnCondition: selectedCondition.value,
          returnConditionLabel: selectedCondition.label,
          damageCharge,
        },
      },
    );

    if (!returned) {
      throw new ConflictError('This instrument rental was already updated.');
    }

    return returned;
  },

  async receiveInstrumentRental(appId, id, {
    receivedAt: requestedReceivedAt,
    depositAmount,
  }) {
    const receivedAt = new Date(requestedReceivedAt || new Date());
    if (Number.isNaN(receivedAt.getTime())) {
      throw new BadRequestError('A valid receive time is required.');
    }
    const rentals = await instrumentRentalsRepository.findAll(appId);
    const rental = rentals.find((item) => item.id === id);
    if (!rental) throw new NotFoundError('Instrument rental not found.');
    if (rental.status !== 'APPROVED') {
      throw new BadRequestError('Only approved rentals can be received.');
    }
    if (rental.metadata?.receivedAt) {
      throw new BadRequestError('This instrument rental has already been received.');
    }
    const received = await instrumentRentalsRepository.receiveRental(appId, id, {
      metadata: {
        ...(rental.metadata || {}),
        receivedAt: receivedAt.toISOString(),
        depositAmount: Number(depositAmount),
        depositStatus: 'RECEIVED',
      },
    });
    if (!received) throw new ConflictError('This instrument rental was already updated.');
    return received;
  },

  async cancelStaffInstrumentRental(appId, id, cancellationReason) {
    if (
      typeof cancellationReason !== 'string' ||
      cancellationReason.trim().length < 3
    ) {
      throw new BadRequestError(
        'A cancellation reason of at least 3 characters is required.',
      );
    }

    const rentals = await instrumentRentalsRepository.findAll(appId);
    const rental = rentals.find(
      (item) =>
        item.id === id &&
        [
          'FOR_APPROVAL',
          'PENDING',
          'PENDING_PAYMENT',
          'PENDING_CONFIRMATION',
          'PARTIALLY_PAID',
        ].includes(item.status),
    );

    if (!rental) {
      throw new NotFoundError('Instrument rental waiting for approval was not found.');
    }

    const cancelled = await instrumentRentalsRepository.updateStaffDecision(
      appId,
      id,
      {
        status: 'CANCELLED',
        metadata: {
          ...(rental.metadata || {}),
          approvalStatus: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
          cancellationReason: cancellationReason?.trim() || null,
        },
      },
    );

    if (!cancelled) {
      throw new ConflictError('This instrument rental has already been processed.');
    }

    return cancelled;
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

    const operatingHours = await settingsService.getOperatingHours(appId);
    const schedule = validateSchedule(scheduledStart, scheduledEnd, operatingHours);
    try { assertRentalStartWithinOperatingHours(operatingHours, schedule.scheduledStart); } catch (error) { throw new BadRequestError(error.message); }

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
    paymentReference,
    paymentMethod = 'QR_PLACEHOLDER',
    status = 'FOR_APPROVAL',
    metadata = {},
    scheduledStart,
    scheduledEnd,
  }) {
    const operatingHours = await settingsService.getOperatingHours(appId);
    const schedule = validateSchedule(scheduledStart, scheduledEnd, operatingHours);
    assertWalkInDateWindow(schedule.scheduledStart);
    try { assertRentalStartWithinOperatingHours(operatingHours, schedule.scheduledStart); } catch (error) { throw new BadRequestError(error.message); }

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
        paymentMethod,
        status,
        metadata,
        schedule,
      });
    }

    return this.createPackageRental({
      appId,
      customerId,
      rentalPackageId,
      paymentMethod,
      status,
      metadata,
      schedule,
    });
  },

  async createWalkInRental({
    appId,
    customer,
    rentalType,
    instrumentId,
    instrumentIds,
    rentalPackageId,
    scheduledStart,
    scheduledEnd,
    paymentMethod = 'CASH',
  }) {
    const walkInCustomer = await createWalkInCustomer({ appId, ...customer });
    return this.createInstrumentRental({
      appId,
      customerId: walkInCustomer.id,
      rentalType,
      instrumentId,
      instrumentIds,
      rentalPackageId,
      scheduledStart,
      scheduledEnd,
      paymentPlan: 'FULL_PAYMENT',
      paymentMethod,
      status: 'APPROVED',
      metadata: {
        walkIn: true,
        customerSnapshot: {
          firstName: walkInCustomer.person.firstName,
          lastName: walkInCustomer.person.lastName,
          phone: walkInCustomer.person.phone,
          email: walkInCustomer.person.email,
        },
      },
    });
  },

  async createIndividualRental({
    appId,
    customerId,
    instrumentId,
    instrumentIds,
    paymentPlan,
    paymentMethod = 'QR_PLACEHOLDER',
    status = 'FOR_APPROVAL',
    metadata: additionalMetadata = {},
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
      status,
      metadata: {
        ...additionalMetadata,
        paymentReference: paymentReference.trim(),
        paymentPlan: selectedPaymentPlan,
        paymentMethod,
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

  async createPackageRental({
    appId,
    customerId,
    rentalPackageId,
    paymentReference,
    paymentMethod = 'QR_PLACEHOLDER',
    status = 'FOR_APPROVAL',
    metadata: additionalMetadata = {},
    schedule,
  }) {
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
      status,
      metadata: {
        ...additionalMetadata,
        paymentReference: paymentReference.trim(),
        paymentMethod,
        paymentStatus: 'PAID',
        paymentCompletedAt: new Date().toISOString(),
      },
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

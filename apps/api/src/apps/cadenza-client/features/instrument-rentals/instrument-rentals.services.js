import {
  BadRequestError,
  NotFoundError,
} from '../../../../common/errors/appError.js';
import { instrumentRentalsRepository } from './instrument-rentals.repository.js';

export const instrumentRentalsService = {
  async getInstrumentRentals(appId) {
    return instrumentRentalsRepository.findAll(appId);
  },

  async getInstrumentRentalById(appId, id) {
    const instrument = await instrumentRentalsRepository.findById(appId, id);

    if (!instrument) {
      throw new NotFoundError('Instrument not found.');
    }

    return instrument;
  },

  async updateInstrumentRental(appId, id, data) {
    const instrument = await instrumentRentalsRepository.findById(appId, id);

    if (!instrument) {
      throw new NotFoundError('Instrument not found.');
    }

    const updateData = {};

    if (data.rentalRate !== undefined) {
      const rentalRate = Number(data.rentalRate);

      if (!Number.isFinite(rentalRate) || rentalRate <= 0) {
        throw new BadRequestError('Rental rate must be greater than zero.');
      }

      updateData.rentalRate = rentalRate;
    }

    if (data.rentalDuration !== undefined) {
      const rentalDuration = Number(data.rentalDuration);

      if (!Number.isInteger(rentalDuration) || rentalDuration <= 0) {
        throw new BadRequestError('Rental duration must be greater than zero.');
      }

      updateData.rentalDuration = rentalDuration;
    }

    if (!Object.keys(updateData).length) {
      throw new BadRequestError(
        'At least one rental configuration field is required.',
      );
    }

    const updated = await instrumentRentalsRepository.update(
      appId,
      id,
      updateData,
    );

    if (!updated) {
      throw new NotFoundError('Instrument not found.');
    }

    return updated;
  },
};

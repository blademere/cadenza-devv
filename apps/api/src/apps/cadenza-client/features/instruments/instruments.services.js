import crypto from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { instrumentsRepository } from './instruments.repository.js';

const prisma = getPrismaClient();

const INSTRUMENT_STATUSES = [
  'AVAILABLE',
  'UNAVAILABLE',
  'MAINTENANCE',
  'RETIRED',
];

const normalizeNullableString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
};

export const instrumentsService = {
  async getInstruments(appId, filters = {}) {
    return instrumentsRepository.findAll(appId, filters);
  },

  async getInstrumentById(appId, id) {
    const instrument = await instrumentsRepository.findById(appId, id);

    if (!instrument) {
      throw new NotFoundError('Instrument not found.');
    }

    return instrument;
  },

  async createInstrument(appId, data) {
    const instrumentType = data.instrumentType?.trim();
    const brand = normalizeNullableString(data.brand);
    const model = normalizeNullableString(data.model);
    const serialNumber = normalizeNullableString(data.serialNumber);
    const status = data.status || 'AVAILABLE';

    if (!instrumentType) {
      throw new BadRequestError('Instrument type is required.');
    }

    if (!INSTRUMENT_STATUSES.includes(status)) {
      throw new BadRequestError('Invalid instrument status.');
    }

    if (serialNumber) {
      const existing = await prisma.cadenzaInstrument.findFirst({
        where: {
          appId,
          serialNumber,
        },
      });

      if (existing) {
        throw new ConflictError(
          'An instrument with this serial number already exists.',
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const name =
        [brand, model].filter(Boolean).join(' ') || instrumentType;

      const resource = await tx.resource.create({
        data: {
          appId,
          key: `instrument-${crypto.randomUUID()}`,
          name,
          type: 'INSTRUMENT',
          status: 'ACTIVE',
        },
      });

      return instrumentsRepository.create(
        {
          appId,
          resourceId: resource.id,
          instrumentType,
          brand,
          model,
          serialNumber,
          rentalRate: null,
          rentalDuration: null,
          status,
          metadata: data.metadata ?? null,
        },
        tx,
      );
    });
  },

  async updateInstrument(appId, id, data) {
    const instrument = await instrumentsRepository.findById(appId, id);

    if (!instrument) {
      throw new NotFoundError('Instrument not found.');
    }

    const updateData = {};

    if (data.instrumentType !== undefined) {
      const instrumentType = data.instrumentType.trim();

      if (!instrumentType) {
        throw new BadRequestError('Instrument type is required.');
      }

      updateData.instrumentType = instrumentType;
    }

    if (data.brand !== undefined) {
      updateData.brand = normalizeNullableString(data.brand);
    }

    if (data.model !== undefined) {
      updateData.model = normalizeNullableString(data.model);
    }

    if (data.serialNumber !== undefined) {
      const serialNumber = normalizeNullableString(
        data.serialNumber,
      );

      if (
        serialNumber &&
        serialNumber !== instrument.serialNumber
      ) {
        const existing = await prisma.cadenzaInstrument.findFirst({
          where: {
            appId,
            serialNumber,
            NOT: {
              id,
            },
          },
        });

        if (existing) {
          throw new ConflictError(
            'An instrument with this serial number already exists.',
          );
        }
      }

      updateData.serialNumber = serialNumber;
    }

    if (data.status !== undefined) {
      if (!INSTRUMENT_STATUSES.includes(data.status)) {
        throw new BadRequestError('Invalid instrument status.');
      }

      updateData.status = data.status;
    }

    if (data.rentalRate !== undefined) {
      updateData.rentalRate = data.rentalRate;
    }

    if (data.rentalDuration !== undefined) {
      updateData.rentalDuration = data.rentalDuration;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    const updated = await instrumentsRepository.update(
      appId,
      id,
      updateData,
    );

    if (!updated) {
      throw new NotFoundError('Instrument not found.');
    }

    return updated;
  },

  async deactivateInstrument(appId, id) {
    return this.updateInstrument(appId, id, {
      status: 'RETIRED',
    });
  },
};
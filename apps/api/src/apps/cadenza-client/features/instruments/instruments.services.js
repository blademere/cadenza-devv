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

const normalizeRentalRate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const rentalRate = Number(value);

  if (!Number.isFinite(rentalRate) || rentalRate < 0) {
    throw new BadRequestError(
      'Rental rate must be a valid non-negative amount.',
    );
  }

  return rentalRate;
};

export const instrumentsService = {
  async getInstruments(appId, filters = {}) {
    return instrumentsRepository.findAll(appId, filters);
  },

  async getInstrumentById(appId, id) {
    const instrument =
      await instrumentsRepository.findById(
        appId,
        id,
      );

    if (!instrument) {
      throw new NotFoundError(
        'Instrument not found.',
      );
    }

    return instrument;
  },

  async createInstrument(appId, data) {
    const brand =
      normalizeNullableString(data.brand);

    const model =
      normalizeNullableString(data.model);

    const serialNumber =
      normalizeNullableString(
        data.serialNumber,
      );

    const rentalRate =
      normalizeRentalRate(
        data.rentalRate,
      );

    const status =
      data.status || 'AVAILABLE';

    if (!INSTRUMENT_STATUSES.includes(status)) {
      throw new BadRequestError(
        'Invalid instrument status.',
      );
    }

    const instrumentTypeId =
      data.instrumentTypeId?.trim() || null;

    const itemCategoryId =
      data.itemCategoryId?.trim() || null;

    if (itemCategoryId) {
      const itemCategory =
        await prisma.cadenzaItemCategory.findFirst({
          where: {
            id: itemCategoryId,
            appId,
            status: 'ACTIVE',
          },
        });

      if (!itemCategory) {
        throw new BadRequestError(
          'Item category is invalid or inactive.',
        );
      }
    }

    if (instrumentTypeId) {
      const instrumentType =
        await prisma.cadenzaInstrumentType.findFirst({
          where: {
            id: instrumentTypeId,
            appId,
            status: 'ACTIVE',
          },
        });

      if (!instrumentType) {
        throw new BadRequestError(
          'Instrument type is invalid or inactive.',
        );
      }
    }

    if (serialNumber) {
      const existing =
        await prisma.cadenzaInstrument.findFirst({
          where: {
            appId,
            serialNumber: {
              equals: serialNumber,
              mode: 'insensitive',
            },
          },
        });

      if (existing) {
        throw new ConflictError(
          'An instrument with this serial number already exists.',
        );
      }
    }

    if (model) {
      const existing =
        await prisma.cadenzaInstrument.findFirst({
          where: {
            appId,
            model: {
              equals: model,
              mode: 'insensitive',
            },
          },
        });

      if (existing) {
        throw new ConflictError(
          'An instrument with this model already exists.',
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const name =
        [brand, model]
          .filter(Boolean)
          .join(' ') || 'Instrument';

      const resource =
        await tx.resource.create({
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
          itemCategoryId,
          instrumentTypeId,
          brand,
          model,
          serialNumber,
          rentalRate,
          status,
          metadata: data.metadata ?? null,
        },
        tx,
      );
    });
  },

  async updateInstrument(
    appId,
    id,
    data,
  ) {
    const instrument =
      await instrumentsRepository.findById(
        appId,
        id,
      );

    if (!instrument) {
      throw new NotFoundError(
        'Instrument not found.',
      );
    }

    const updateData = {};

    if (data.itemCategoryId !== undefined) {
      const itemCategoryId =
        data.itemCategoryId?.trim() || null;

      if (itemCategoryId) {
        const itemCategory =
          await prisma.cadenzaItemCategory.findFirst({
            where: {
              id: itemCategoryId,
              appId,
              status: 'ACTIVE',
            },
          });

        if (!itemCategory) {
          throw new BadRequestError(
            'Item category is invalid or inactive.',
          );
        }
      }

      updateData.itemCategoryId = itemCategoryId;
    }

    if (data.instrumentTypeId !== undefined) {
      const instrumentTypeId =
        data.instrumentTypeId?.trim() || null;

      if (instrumentTypeId) {
        const instrumentType =
          await prisma.cadenzaInstrumentType.findFirst({
            where: {
              id: instrumentTypeId,
              appId,
              status: 'ACTIVE',
            },
          });

        if (!instrumentType) {
          throw new BadRequestError(
            'Instrument type is invalid or inactive.',
          );
        }
      }

      updateData.instrumentTypeId = instrumentTypeId;
    }

    if (data.brand !== undefined) {
      updateData.brand =
        normalizeNullableString(
          data.brand,
        );
    }

    if (data.model !== undefined) {
      const model = normalizeNullableString(data.model);

      if (
        model &&
        model.toLowerCase() !==
          (instrument.model || '').toLowerCase()
      ) {
        const existing =
          await prisma.cadenzaInstrument.findFirst({
            where: {
              appId,
              model: {
                equals: model,
                mode: 'insensitive',
              },
              NOT: {
                id,
              },
            },
          });

        if (existing) {
          throw new ConflictError(
            'An instrument with this model already exists.',
          );
        }
      }

      updateData.model = model;
    }

    if (data.serialNumber !== undefined) {
      const serialNumber =
        normalizeNullableString(
          data.serialNumber,
        );

      if (
        serialNumber &&
        serialNumber !==
          instrument.serialNumber
      ) {
        const existing =
          await prisma.cadenzaInstrument.findFirst(
            {
              where: {
                appId,
                serialNumber: {
                  equals: serialNumber,
                  mode: 'insensitive',
                },
                NOT: {
                  id,
                },
              },
            },
          );

        if (existing) {
          throw new ConflictError(
            'An instrument with this serial number already exists.',
          );
        }
      }

      updateData.serialNumber =
        serialNumber;
    }

    if (data.rentalRate !== undefined) {
      updateData.rentalRate =
        normalizeRentalRate(
          data.rentalRate,
        );
    }

    if (data.status !== undefined) {
      if (
        !INSTRUMENT_STATUSES.includes(
          data.status,
        )
      ) {
        throw new BadRequestError(
          'Invalid instrument status.',
        );
      }

      updateData.status =
        data.status;
    }

    if (data.metadata !== undefined) {
      updateData.metadata =
        data.metadata;
    }

    const updated =
      await instrumentsRepository.update(
        appId,
        id,
        updateData,
      );

    if (!updated) {
      throw new NotFoundError(
        'Instrument not found.',
      );
    }

    return updated;
  },

  async deactivateInstrument(
    appId,
    id,
  ) {
    return this.updateInstrument(
      appId,
      id,
      {
        status: 'RETIRED',
      },
    );
  },
};

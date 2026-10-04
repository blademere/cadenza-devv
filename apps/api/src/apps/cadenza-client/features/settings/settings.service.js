import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { settingsRepository } from './settings.repository.js';

export const settingsService = {
  async getItemCategories(appId) {
    return settingsRepository.findItemCategories(appId);
  },

  async createItemCategory(appId, data) {
    const name = String(data?.name || '').trim();

    if (!name) {
      throw new BadRequestError('Item category name is required.');
    }

    try {
      return await settingsRepository.createItemCategory({
        appId,
        name,
        status: 'ACTIVE',
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictError('This item category already exists.');
      }

      throw error;
    }
  },

  async updateItemCategory(appId, id, status) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestError('Invalid item category status.');
    }

    const existing = await settingsRepository.findItemCategory(appId, id);

    if (!existing) {
      throw new NotFoundError('Item category not found.');
    }

    await settingsRepository.updateItemCategory(appId, id, { status });
    return settingsRepository.findItemCategory(appId, id);
  },

  async getInstrumentTypes(appId, status) {
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestError('Invalid instrument type status.');
    }

    return settingsRepository.findInstrumentTypes(appId, status);
  },

  async createInstrumentType(appId, data) {
    const name = String(data?.name || '').trim();

    if (!name) {
      throw new BadRequestError('Instrument type name is required.');
    }

    const existing = await settingsRepository.findInstrumentTypeByName(
      appId,
      name,
    );

    if (existing?.status === 'ACTIVE') {
      throw new ConflictError(
        'This instrument type already exists.',
      );
    }

    if (existing) {
      await settingsRepository.updateInstrumentType(
        appId,
        existing.id,
        { status: 'ACTIVE' },
      );

      return settingsRepository.findInstrumentType(
        appId,
        existing.id,
      );
    }

    try {
      return await settingsRepository.createInstrumentType({
        appId,
        name,
        status: 'ACTIVE',
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          'This instrument type already exists.',
        );
      }

      throw error;
    }
  },

  async updateInstrumentType(appId, id, status) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestError('Invalid instrument type status.');
    }

    const existing = await settingsRepository.findInstrumentType(
      appId,
      id,
    );

    if (!existing) {
      throw new NotFoundError('Instrument type not found.');
    }

    await settingsRepository.updateInstrumentType(appId, id, {
      status,
    });

    return settingsRepository.findInstrumentType(appId, id);
  },
};

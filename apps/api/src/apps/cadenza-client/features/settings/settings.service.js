import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { settingsRepository } from './settings.repository.js';
import { DEFAULT_WEEKLY_HOURS, getDateKey, validateHours } from './operating-hours.js';
import { getStorageService } from '../../../../platform/storage/storage.registry.js';
import { createStorageKey, sanitizeFileName } from '../../../../platform/storage/storage.key.js';
import { allowedTypes } from './settings.upload.js';

export const settingsService = {
  async getOperatingHours(appId) {
    const current = await settingsRepository.findOperatingHours(appId);
    if (current) return current;
    return settingsRepository.upsertOperatingHours(appId, { weeklyHours: DEFAULT_WEEKLY_HOURS, previousWeeklyHours: null, defaultEffectiveFrom: null, dateOverrides: {}, timezone: 'Asia/Manila' });
  },

  async updateOperatingHours(appId, data) {
    const weeklyHours = data?.weeklyHours || DEFAULT_WEEKLY_HOURS;
    const dateOverrides = data?.dateOverrides || {};
    const existing = await settingsRepository.findOperatingHours(appId);
    const today = getDateKey();
    for (const [date, entry] of Object.entries(dateOverrides)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestError('Customization dates must use YYYY-MM-DD format.');
      const existingEntry = existing?.dateOverrides?.[date];
      if (date <= today && !existingEntry) throw new BadRequestError('Operating-hour customizations are only allowed from tomorrow onward.');
      if (date <= today && JSON.stringify(entry) !== JSON.stringify(existingEntry)) throw new BadRequestError('Current and previous dates cannot be changed.');
    }
    try { validateHours(weeklyHours, dateOverrides); } catch (error) { throw new BadRequestError(error.message); }
    const weeklyChanged = JSON.stringify(weeklyHours) !== JSON.stringify(existing?.weeklyHours);
    const tomorrow = new Date(`${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T00:00:00+08:00`);
    const effectiveKey = existing?.defaultEffectiveFrom ? getDateKey(new Date(existing.defaultEffectiveFrom)) : null;
    return settingsRepository.upsertOperatingHours(appId, {
      weeklyHours,
      previousWeeklyHours: weeklyChanged
        ? (effectiveKey && effectiveKey > today ? existing?.previousWeeklyHours || existing?.weeklyHours : existing?.weeklyHours)
        : existing?.previousWeeklyHours || null,
      defaultEffectiveFrom: weeklyChanged ? tomorrow : existing?.defaultEffectiveFrom || null,
      dateOverrides,
      timezone: data?.timezone || 'Asia/Manila',
    });
  },

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

  async getBankAccounts(appId) {
    const accounts = await settingsRepository.findBankAccounts(appId);
    return accounts.map(({ qrStorageKey, ...account }) => ({
      ...account,
      hasQr: Boolean(qrStorageKey),
    }));
  },

  async getPaymentBankAccounts(appId) {
    const accounts = await settingsRepository.findBankAccounts(appId);
    return accounts
      .filter((account) => account.status === 'ACTIVE')
      .map(({ qrStorageKey, ...account }) => ({ ...account, hasQr: Boolean(qrStorageKey) }));
  },

  async createBankAccount(appId, { bankName, accountNumber, file }) {
    const normalizedBankName = String(bankName || '').trim().replace(/\s+/g, ' ');
    if (!normalizedBankName || normalizedBankName.length > 100) {
      throw new BadRequestError('A valid bank name is required.');
    }
    const normalizedAccountNumber = String(accountNumber || '').trim().replace(/\s+/g, ' ');
    if (!/^[0-9][0-9 -]{3,49}$/.test(normalizedAccountNumber)) {
      throw new BadRequestError('A valid bank account number is required.');
    }
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestError('A QR image is required.');
    }
    if (!allowedTypes.has(file.mimetype)) {
      throw new BadRequestError('The QR file must be a PNG, JPG, or WebP image.');
    }

    let fileName;
    try { fileName = sanitizeFileName(file.originalname || 'bank-account-qr'); } catch { fileName = 'bank-account-qr'; }
    const storage = getStorageService();
    const storageKey = createStorageKey(fileName, 'cadenza-bank-account-qr');
    await storage.put({ key: storageKey, body: file.buffer, contentType: file.mimetype });

    try {
      const created = await settingsRepository.createBankAccount({
        appId,
        bankName: normalizedBankName,
        accountNumber: normalizedAccountNumber,
        qrStorageKey: storageKey,
        qrMimeType: file.mimetype,
        qrFileName: fileName,
        qrFileSize: file.buffer.length,
        status: 'ACTIVE',
      });
      const { qrStorageKey, ...account } = created;
      return { ...account, hasQr: Boolean(qrStorageKey) };
    } catch (error) {
      await storage.delete({ key: storageKey }).catch(() => undefined);
      if (error?.code === 'P2002') throw new ConflictError('This bank account is already registered.');
      throw error;
    }
  },

  async updateBankAccount(appId, id, status) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new BadRequestError('Invalid bank account status.');
    const existing = await settingsRepository.findBankAccount(appId, id);
    if (!existing) throw new NotFoundError('Bank account not found.');
    await settingsRepository.updateBankAccount(appId, id, { status });
    const { qrStorageKey, ...account } = await settingsRepository.findBankAccount(appId, id);
    return { ...account, hasQr: Boolean(qrStorageKey) };
  },

  async getBankAccountQr(appId, id, activeOnly = false) {
    const account = await settingsRepository.findBankAccount(appId, id);
    if (!account) throw new NotFoundError('Bank account not found.');
    if (activeOnly && account.status !== 'ACTIVE') throw new NotFoundError('Payment account not found.');
    const { body } = await getStorageService().get({ key: account.qrStorageKey });
    return { body, contentType: account.qrMimeType, fileName: account.qrFileName };
  },
};

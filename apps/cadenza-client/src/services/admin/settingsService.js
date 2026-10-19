import { apiClient } from '@/core/api/apiClient';

const ENDPOINT = '/settings/instrument-types';
const CATEGORY_ENDPOINT = '/settings/item-categories';
const OPERATING_HOURS_ENDPOINT = '/settings/operating-hours';
const BANK_ACCOUNTS_ENDPOINT = '/settings/bank-accounts';

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

export async function getInstrumentTypes(status) {
  const query = status ? `?status=${status}` : '';

  return unwrap(
    await apiClient.get(`${ENDPOINT}${query}`),
  );
}

export async function createInstrumentType(name) {
  return unwrap(
    await apiClient.post(ENDPOINT, { name }),
  );
}

export async function updateInstrumentTypeStatus(id, status) {
  return unwrap(
    await apiClient.patch(`${ENDPOINT}/${id}`, { status }),
  );
}

export async function getItemCategories() {
  return unwrap(await apiClient.get(CATEGORY_ENDPOINT));
}

export async function createItemCategory(name) {
  return unwrap(await apiClient.post(CATEGORY_ENDPOINT, { name }));
}

export async function updateItemCategoryStatus(id, status) {
  return unwrap(
    await apiClient.patch(`${CATEGORY_ENDPOINT}/${id}`, { status }),
  );
}

export async function getOperatingHours() {
  return unwrap(await apiClient.get(OPERATING_HOURS_ENDPOINT));
}

export async function updateOperatingHours(data) {
  return unwrap(await apiClient.put(OPERATING_HOURS_ENDPOINT, data));
}

export async function getBankAccounts() {
  return unwrap(await apiClient.get(BANK_ACCOUNTS_ENDPOINT));
}

export async function createBankAccount(formData) {
  return unwrap(await apiClient.post(BANK_ACCOUNTS_ENDPOINT, formData));
}

export async function updateBankAccountStatus(id, status) {
  return unwrap(await apiClient.patch(`${BANK_ACCOUNTS_ENDPOINT}/${id}`, { status }));
}

export async function getBankAccountQr(id) {
  return apiClient.file(`${BANK_ACCOUNTS_ENDPOINT}/${id}/qr`);
}

import { apiClient } from '@/core/api/apiClient';

const ENDPOINT = '/settings/instrument-types';
const CATEGORY_ENDPOINT = '/settings/item-categories';

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

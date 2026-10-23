import { apiClient } from '@/core/api/apiClient';

const ENDPOINT = '/settings/payment-accounts';

export async function getPaymentAccounts() {
  const response = await apiClient.get(ENDPOINT);
  const payload = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(payload) ? payload : [];
}

export async function getPaymentAccountQr(id) {
  return apiClient.file(`${ENDPOINT}/${id}/qr`);
}

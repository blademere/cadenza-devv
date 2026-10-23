import { apiClient } from '@/core/api/apiClient';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

const refundPath = (type, id) =>
  `/billing/payments/refunds/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;

export const getTransactionRefundQuote = async (type, id) =>
  unwrap(await apiClient.get(refundPath(type, id)));

export const recordTransactionRefund = async (type, id, data) =>
  unwrap(await apiClient.post(refundPath(type, id), data));

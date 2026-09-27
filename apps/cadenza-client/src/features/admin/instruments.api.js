import { apiClient } from "@/core/api/apiClient";

const INSTRUMENTS_URL = '/cadenza-client/instruments';

const unwrap = (response) => response.data?.data ?? response.data;

export const getInstruments = async (filters = {}) => {
  const params = {};

  if (filters.status && filters.status !== 'ALL') {
    params.status = filters.status;
  }

  if (filters.instrumentType && filters.instrumentType !== 'ALL') {
    params.instrumentType = filters.instrumentType;
  }


  return unwrap(await apiClient.get(INSTRUMENTS_URL, { params }));
};

export const createInstrument = async (data) =>
  unwrap(
    await apiClient.post(INSTRUMENTS_URL, data, {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    }),
  );

export const updateInstrument = async (id, data) =>
  unwrap(
    await apiClient.patch(`${INSTRUMENTS_URL}/${id}`, data, {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    }),
  );

export const deactivateInstrument = async (id) =>
  unwrap(
    await apiClient.patch(
      `${INSTRUMENTS_URL}/${id}/deactivate`,
      {},
      {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
        },
      },
    ),
  );

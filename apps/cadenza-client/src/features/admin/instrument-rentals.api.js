import { apiClient } from '@/core/api/apiClient';

const INSTRUMENT_RENTALS_URL = '/cadenza-client/instrument-rentals';

const unwrap = (response) => response.data?.data ?? response.data;

export const getInstrumentRentals = async () => {
  return unwrap(await apiClient.get(INSTRUMENT_RENTALS_URL));
};

export const updateInstrumentRental = async (id, data) => {
  return unwrap(
    await apiClient.patch(`${INSTRUMENT_RENTALS_URL}/${id}`, data, {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    }),
  );
};

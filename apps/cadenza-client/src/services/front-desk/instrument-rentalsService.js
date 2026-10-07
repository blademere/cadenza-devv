import { apiClient } from '@/core/api/apiClient';

const INSTRUMENT_RENTALS_URL = '/instrument-rentals';

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

export const getInstrumentRentals = async () => {
  const response = await apiClient.get(INSTRUMENT_RENTALS_URL);

  return unwrap(response);
};

export const getRentalPackages = async () => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/packages`,
  );

  return unwrap(response);
};

export const getRentalPackage = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/packages/${id}`,
  );

  return unwrap(response);
};

export const createRentalPackage = async (data) => {
  const response = await apiClient.post(
    `${INSTRUMENT_RENTALS_URL}/packages`,
    data,
  );

  return unwrap(response);
};

export const updateRentalPackage = async (id, data) => {
  const response = await apiClient.patch(
    `${INSTRUMENT_RENTALS_URL}/packages/${id}`,
    data,
  );

  return unwrap(response);
};

export const deleteRentalPackage = async (id) => {
  const response = await apiClient.delete(
    `${INSTRUMENT_RENTALS_URL}/packages/${id}`,
  );

  return unwrap(response);
};

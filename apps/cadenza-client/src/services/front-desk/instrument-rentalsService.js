import { apiClient } from '@/core/api/apiClient';

const INSTRUMENT_RENTALS_URL = '/instrument-rentals';

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

export const getInstrumentRentals = async () => {
  const response = await apiClient.get(INSTRUMENT_RENTALS_URL);

  return unwrap(response);
};

export const getReturnConditions = async () =>
  unwrap(await apiClient.get(`${INSTRUMENT_RENTALS_URL}/return-conditions`));

export const approveInstrumentRental = async (id) =>
  unwrap(await apiClient.patch(`${INSTRUMENT_RENTALS_URL}/${id}/approve`));

export const returnInstrumentRental = async (id, data) =>
  unwrap(await apiClient.patch(`${INSTRUMENT_RENTALS_URL}/${id}/return`, data));

export const receiveInstrumentRental = async (id, data) =>
  unwrap(await apiClient.patch(`${INSTRUMENT_RENTALS_URL}/${id}/receive`, data));

export const cancelInstrumentRental = async (id, cancellationReason) =>
  unwrap(
    await apiClient.patch(
      `${INSTRUMENT_RENTALS_URL}/${id}/cancel-by-staff`,
      { cancellationReason },
    ),
  );

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

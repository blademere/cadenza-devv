import { apiClient } from "@/core/api/apiClient";

const ENDPOINT = "/instrument-rentals";

const buildQuery = (params) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  return query.toString();
};

const getAvailableInstruments = async ({
  scheduledStart,
  scheduledEnd,
}) => {
  const query = buildQuery({
    scheduledStart,
    scheduledEnd,
  });

  const response = await apiClient.get(
    `${ENDPOINT}/available?${query}`,
  );

  return response.data?.data ?? [];
};

const getMyInstrumentRentals = async () => {
  const response = await apiClient.get(
    `${ENDPOINT}/mine`,
  );

  return response.data?.data ?? [];
};

const getInstrumentRentalById = async (id) => {
  const response = await apiClient.get(
    `${ENDPOINT}/${id}`,
  );

  return response.data?.data ?? null;
};

const createInstrumentRental = async (data) => {
  const response = await apiClient.post(
    ENDPOINT,
    data,
  );

  return response.data?.data ?? null;
};

const cancelInstrumentRental = async (id) => {
  const response = await apiClient.patch(
    `${ENDPOINT}/${id}/cancel`,
    {},
  );

  return response.data?.data ?? null;
};

export {
  getAvailableInstruments,
  getMyInstrumentRentals,
  getInstrumentRentalById,
  createInstrumentRental,
  cancelInstrumentRental,
};
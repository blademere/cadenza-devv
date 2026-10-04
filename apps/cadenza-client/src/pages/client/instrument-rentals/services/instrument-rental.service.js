import { apiClient } from '@/core/api/apiClient'

const INSTRUMENT_RENTALS_URL = '/instrument-rentals'

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response

export const getInstrument = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/available/${id}`,
  )

  return unwrap(response)
}

export const getAvailableInstruments = async () => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/available`,
  )

  return unwrap(response)
}

export const getAvailableInstrumentById = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/available/${id}`,
  )

  return unwrap(response)
}

export const getInstrumentRental = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/mine/${id}`,
  )

  return unwrap(response)
}

export const checkInstrumentAvailability = async ({
  scheduledStart,
  scheduledEnd,
}) => {
  const params = new URLSearchParams({
    scheduledStart: new Date(
      scheduledStart,
    ).toISOString(),

    scheduledEnd: new Date(
      scheduledEnd,
    ).toISOString(),
  })

  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/check-availability?${params.toString()}`,
  )

  return unwrap(response)
}

export const getRentalPackages = async () => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/packages`,
  )

  return unwrap(response)
}

export const getRentalPackageById = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/packages/${id}`,
  )

  return unwrap(response)
}

export const getMyInstrumentRentals = async () => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/mine`,
  )

  return unwrap(response)
}

export const getMyInstrumentRentalById = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENT_RENTALS_URL}/mine/${id}`,
  )

  return unwrap(response)
}

export const createInstrumentRental = async (data) => {
  const response = await apiClient.post(
    INSTRUMENT_RENTALS_URL,
    data,
  )

  return unwrap(response)
}

export const cancelInstrumentRental = async (
  id,
  cancellationReason,
) => {
  const response = await apiClient.patch(
    `${INSTRUMENT_RENTALS_URL}/${id}/cancel`,
    {
      cancellationReason,
    },
  )

  return unwrap(response)
}

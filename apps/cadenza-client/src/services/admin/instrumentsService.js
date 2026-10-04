import { apiClient } from '@/core/api/apiClient'

const INSTRUMENTS_URL = '/instruments'

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response

export const getInstruments = async () => {
  const response = await apiClient.get(INSTRUMENTS_URL)

  return unwrap(response)
}

export const getInstrument = async (id) => {
  const response = await apiClient.get(
    `${INSTRUMENTS_URL}/${id}`,
  )

  return unwrap(response)
}

export const createInstrument = async (data) => {
  const response = await apiClient.post(
    INSTRUMENTS_URL,
    data,
  )

  return unwrap(response)
}

export const updateInstrument = async (id, data) => {
  const response = await apiClient.patch(
    `${INSTRUMENTS_URL}/${id}`,
    data,
  )

  return unwrap(response)
}

export const deactivateInstrument = async (id) => {
  const response = await apiClient.patch(
    `${INSTRUMENTS_URL}/${id}/deactivate`,
  )

  return unwrap(response)
}
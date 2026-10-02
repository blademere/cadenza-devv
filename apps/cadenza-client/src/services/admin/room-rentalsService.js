import { apiClient } from '@/core/api/apiClient'

const ROOMS_URL = '/rooms'

const unwrap = (response) => response.data?.data ?? response.data

export const getRoomRentals = async () => {
  return unwrap(await apiClient.get(ROOMS_URL))
}

export const updateRoomRental = async (id, data) => {
  return unwrap(
    await apiClient.patch(`${ROOMS_URL}/${id}`, data, {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    })
  )
}
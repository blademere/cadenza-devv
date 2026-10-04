import { apiClient } from "@/core/api/apiClient";

const ROOMS_URL = '/rooms'

const unwrap = (response) => response.data?.data ?? response.data

export const getRooms = async () => unwrap(await apiClient.get(ROOMS_URL))

export const createRoom = async (data) => unwrap(await apiClient.post(ROOMS_URL, data, {
  headers: { 'Idempotency-Key': crypto.randomUUID() },
}))

export const updateRoom = async (id, data) => unwrap(await apiClient.patch(`${ROOMS_URL}/${id}`, data, {
  headers: { 'Idempotency-Key': crypto.randomUUID() },
}))

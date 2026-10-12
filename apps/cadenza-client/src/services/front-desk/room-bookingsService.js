import { apiClient } from '@/core/api/apiClient';

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

export const getRoomBookings = async () =>
  unwrap(await apiClient.get('/room-bookings'));

export const approveRoomBooking = async (id) =>
  unwrap(await apiClient.patch(`/room-bookings/${id}/approve`));

export const cancelRoomBooking = async (id, cancellationReason) =>
  unwrap(
    await apiClient.patch(`/room-bookings/${id}/cancel-by-staff`, {
      cancellationReason,
    }),
  );

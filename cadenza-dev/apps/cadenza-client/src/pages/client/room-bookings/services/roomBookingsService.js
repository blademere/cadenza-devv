import { apiClient } from '@/core/api/apiClient';

const ROOM_BOOKINGS_ENDPOINT = '/room-bookings';

const roomBookingService = {
  async getAvailableRooms(scheduledStart, scheduledEnd) {
    if (!scheduledStart || !scheduledEnd) {
      return [];
    }

    const query = new URLSearchParams({
      scheduledStart,
      scheduledEnd,
    });

    const response = await apiClient.get(
      `${ROOM_BOOKINGS_ENDPOINT}/available?${query.toString()}`,
    );

    return response?.data ?? [];
  },

  async getMyRoomBookings() {
    const response = await apiClient.get(`${ROOM_BOOKINGS_ENDPOINT}/mine`);

    return response?.data ?? [];
  },

  async getRoomBookingById(id) {
    const response = await apiClient.get(`${ROOM_BOOKINGS_ENDPOINT}/${id}`);

    return response?.data;
  },

  async createRoomBooking(data) {
    const response = await apiClient.post(ROOM_BOOKINGS_ENDPOINT, data);

    return response?.data;
  },

  async cancelRoomBooking(id, cancellationReason) {
    const response = await apiClient.patch(
      `${ROOM_BOOKINGS_ENDPOINT}/${id}/cancel`,
      {
        cancellationReason,
      },
    );

    return response?.data;
  },
};

export default roomBookingService;

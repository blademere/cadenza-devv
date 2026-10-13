import api from "./api";

function unwrap(response) {
  return response.data?.data ?? response.data;
}

function createIdempotencyKey() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mutationConfig() {
  return {
    headers: {
      "Idempotency-Key": createIdempotencyKey(),
    },
  };
}

export async function getAvailableEnrollmentPackages() {
  return unwrap(await api.get("/enrollments/available-packages"));
}

export async function getEnrollmentInstructors(packageId, courseId) {
  return unwrap(
    await api.get(`/enrollments/packages/${packageId}/instructors`, {
      params: courseId ? { courseId } : undefined,
    }),
  );
}

export async function getInstructorAvailability(
  packageId,
  instructorId,
  courseId,
) {
  return unwrap(
    await api.get(
      `/enrollments/packages/${packageId}/instructors/${instructorId}/availability`,
      { params: courseId ? { courseId } : undefined },
    ),
  );
}

export async function getMyEnrollment() {
  return unwrap(await api.get("/enrollments/mine"));
}

export async function createEnrollment(payload) {
  return unwrap(await api.post("/enrollments", payload, mutationConfig()));
}

export async function getEnrollment(id) {
  return unwrap(await api.get(`/enrollments/${id}`));
}

export async function cancelEnrollment(id) {
  return unwrap(
    await api.patch(`/enrollments/${id}/cancel`, {}, mutationConfig()),
  );
}

export async function getAvailableRooms(scheduledStart, scheduledEnd) {
  return unwrap(
    await api.get("/room-bookings/available", {
      params: { scheduledStart, scheduledEnd },
    }),
  );
}

export async function getMyRoomBookings() {
  return unwrap(await api.get("/room-bookings/mine"));
}

export async function createRoomBooking(payload) {
  return unwrap(await api.post("/room-bookings", payload, mutationConfig()));
}

export async function getRoomBooking(id) {
  return unwrap(await api.get(`/room-bookings/${id}`));
}

export async function cancelRoomBooking(id, cancellationReason) {
  return unwrap(
    await api.patch(
      `/room-bookings/${id}/cancel`,
      { cancellationReason },
      mutationConfig(),
    ),
  );
}

export async function getAvailableInstruments() {
  return unwrap(await api.get("/instrument-rentals/available"));
}

export async function getAvailableInstrument(id) {
  return unwrap(await api.get(`/instrument-rentals/available/${id}`));
}

export async function checkInstrumentAvailability(
  scheduledStart,
  scheduledEnd,
) {
  return unwrap(
    await api.get("/instrument-rentals/check-availability", {
      params: { scheduledStart, scheduledEnd },
    }),
  );
}

export async function getInstrumentRentalPackages() {
  return unwrap(await api.get("/instrument-rentals/packages"));
}

export async function getInstrumentRentalPackage(id) {
  return unwrap(await api.get(`/instrument-rentals/packages/${id}`));
}

export async function getMyInstrumentRentals() {
  return unwrap(await api.get("/instrument-rentals/mine"));
}

export async function getMyInstrumentRental(id) {
  return unwrap(await api.get(`/instrument-rentals/mine/${id}`));
}

export async function createInstrumentRental(payload) {
  return unwrap(
    await api.post("/instrument-rentals", payload, mutationConfig()),
  );
}

export async function cancelInstrumentRental(id, cancellationReason) {
  return unwrap(
    await api.patch(
      `/instrument-rentals/${id}/cancel`,
      { cancellationReason },
      mutationConfig(),
    ),
  );
}

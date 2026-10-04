import api from "./api";

export async function getAvailability() {
  const response = await api.get("/instructorAvailability");

  return response;
}

export async function createAvailability(dayOfWeek, timeSlotId) {
  const response = await api.post("/instructorAvailability", {
    day_of_week: dayOfWeek,
    time_slot_id: timeSlotId,
  });

  return response;
}

export async function updateAvailability(id, dayOfWeek, timeSlotId) {
  const response = await api.put(`/instructorAvailability/${id}`, {
    day_of_week: dayOfWeek,
    time_slot_id: timeSlotId,
  });

  return response;
}

export async function deleteAvailability(id) {
  const response = await api.delete(`/instructorAvailability/${id}`);

  return response;
}
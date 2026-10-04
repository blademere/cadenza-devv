import api from "./api";

export async function getTimeSlots() {
  const response = await api.get("/timeSlots");

  return response;
}
import api from "./api";

export async function getSchedule() {
  const response = await api.get("/instructorSchedule");

  return response;
}
import { apiClient } from "@/core/api/apiClient";

const STUDENTS_ENDPOINT = "/students";

const unwrap = (response) => response?.data ?? response;

const unwrapList = (response) => {
  const payload = unwrap(response);
  const data = payload?.data ?? payload?.students ?? payload;

  return Array.isArray(data) ? data : [];
};

export async function getStudents() {
  const response = await apiClient.get(STUDENTS_ENDPOINT);
  return unwrapList(response);
}
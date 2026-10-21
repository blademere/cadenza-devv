import { apiClient } from "@/core/api/apiClient";

const STUDENTS_ENDPOINT = "/students";

const unwrap = (response) => response?.data ?? response;

const unwrapList = (response) => {
  const payload = unwrap(response);
  const data = payload?.data ?? payload?.students ?? payload;

  return Array.isArray(data) ? data : [];
};

export async function getStudents(params = {}) {
  const response = await apiClient.get(STUDENTS_ENDPOINT, { params });
  const payload = unwrap(response);
  const result = {
    items: unwrapList(response),
    pagination: payload?.pagination ?? null,
  };
  return Object.keys(params).length ? result : result.items;
}

import { apiClient } from "@/core/api/apiClient";

const COURSES_ENDPOINT = "/courses";

const unwrap = (response) =>
  Array.isArray(response)
    ? response
    : response?.data ?? response ?? [];

export async function getCourses() {
  const response = await apiClient.get(
    COURSES_ENDPOINT,
  );

  return unwrap(response);
}

export async function getCourse(id) {
  const response = await apiClient.get(
    `${COURSES_ENDPOINT}/${id}`,
  );

  return response?.data ?? response;
}

export async function createCourse(data) {
  const response = await apiClient.post(
    COURSES_ENDPOINT,
    data,
  );

  return response?.data ?? response;
}

export async function updateCourse(id, data) {
  const response = await apiClient.patch(
    `${COURSES_ENDPOINT}/${id}`,
    data,
  );

  return response?.data ?? response;
}

export async function deleteCourse(id) {
  return apiClient.delete(
    `${COURSES_ENDPOINT}/${id}`,
  );
}

export async function deleteCourseAttachment(
  courseId,
  attachmentId,
) {
  return apiClient.delete(
    `${COURSES_ENDPOINT}/${courseId}/attachments/${attachmentId}`,
  );
}

export async function deactivateCourse(id) {
  const response = await apiClient.patch(
    `${COURSES_ENDPOINT}/${id}/deactivate`,
  );

  return response?.data ?? response;
}

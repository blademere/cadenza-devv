import { apiClient } from "@/core/api/apiClient";

const COURSES_ENDPOINT = "/cadenza-client/courses-materials";

export async function getCourses() {
  const response = await apiClient.get(
    COURSES_ENDPOINT,
  );

  return response?.data ?? [];
}

export async function getCourse(id) {
  const response = await apiClient.get(
    `${COURSES_ENDPOINT}/${id}`,
  );

  return response?.data;
}

export async function createCourse(data) {
  const response = await apiClient.post(
    COURSES_ENDPOINT,
    data,
  );

  return response?.data;
}

export async function updateCourse(id, data) {
  const response = await apiClient.patch(
    `${COURSES_ENDPOINT}/${id}`,
    data,
  );

  return response?.data;
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
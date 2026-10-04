import { apiClient } from "@/core/api/apiClient";

const unwrapData = (response, fallback) =>
  response?.data?.data ?? response?.data ?? response ?? fallback;

export async function getAvailablePackages() {
  const response = await apiClient.get('/enrollments/available-packages');

  const data = unwrapData(response, []);

  return Array.isArray(data) ? data : [];
}

export async function getMyEnrollment() {
  const response = await apiClient.get('/enrollments/mine');

  return unwrapData(response, null);
}

export async function getCompatibleInstructors(packageId, courseId) {
  const query = courseId
    ? `?courseId=${encodeURIComponent(courseId)}`
    : '';

  const response = await apiClient.get(
    `/enrollments/packages/${packageId}/instructors${query}`,
  );

  const data = unwrapData(response, []);

  return Array.isArray(data) ? data : [];
}

export async function getInstructorAvailability(
  packageId,
  instructorId,
  courseId,
) {
  const query = courseId
    ? `?courseId=${encodeURIComponent(courseId)}`
    : '';

  const response = await apiClient.get(
    `/enrollments/packages/${packageId}/instructors/${instructorId}/availability${query}`,
  );

  return unwrapData(response, null);
}

export async function createEnrollment(enrollmentData) {
  const response = await apiClient.post('/enrollments', enrollmentData);

  return unwrapData(response, null);
}

export async function getEnrollmentById(enrollmentId) {
  const response = await apiClient.get(`/enrollments/${enrollmentId}`);

  return unwrapData(response, null);
}

export async function cancelEnrollment(enrollmentId) {
  const response = await apiClient.patch(`/enrollments/${enrollmentId}/cancel`);

  return unwrapData(response, null);
}

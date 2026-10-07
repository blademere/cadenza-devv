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

/**
 * Load the complete set of enrollment choices for a course.  Availability is
 * loaded here, instead of making the page fetch it only after an instructor is
 * selected, so unavailable instructors never become selectable options.
 */
export async function getEnrollmentOptions(packageId, courseId) {
  const instructors = await getCompatibleInstructors(packageId, courseId);

  const options = await Promise.all(
    instructors.map(async (instructor) => {
      const result = await getInstructorAvailability(
        packageId,
        instructor.id,
        courseId,
      );

      return {
        ...instructor,
        availability: Array.isArray(result?.availability)
          ? result.availability
          : [],
      };
    }),
  );

  return options.filter((instructor) => instructor.availability.length > 0);
}

export async function getInstructorAvailability(
  packageId,
  instructorId,
  courseId,
  startDate,
) {
  const params = new URLSearchParams();

  if (courseId) {
    params.set('courseId', courseId);
  }

  if (startDate) {
    params.set('startDate', startDate);
  }

  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get(
    `/enrollments/packages/${packageId}/instructors/${instructorId}/availability${query}`,
  );

  return unwrapData(response, null);
}

export async function createEnrollment(enrollmentData) {
  const response = await apiClient.post('/enrollments', enrollmentData);

  return unwrapData(response, null);
}

export async function validateEnrollmentSchedule(enrollmentData) {
  const response = await apiClient.post(
    '/enrollments/validate-schedule',
    enrollmentData,
  );

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

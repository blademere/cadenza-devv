import { apiClient } from '@/core/api/apiClient';

const INSTRUCTORS_ENDPOINT = '/instructors';

const unwrap = (response) => response?.data ?? response;

const unwrapList = (response) => {
  const payload = unwrap(response);
  const data = payload?.data ?? payload?.instructors ?? payload;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.instructors)) {
    return data.instructors;
  }

  return [];
};

export async function getInstructors(filters = {}) {
  const params = {};

  if (filters.status) {
    params.status = filters.status;
  }

  if (filters.courseId) {
    params.courseId = filters.courseId;
  }

  const response = await apiClient.get(INSTRUCTORS_ENDPOINT, {
    params,
  });

  return unwrapList(response);
}

export async function getInstructor(id) {
  const response = await apiClient.get(`${INSTRUCTORS_ENDPOINT}/${id}`);

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function createInstructor(data) {
  const response = await apiClient.post(INSTRUCTORS_ENDPOINT, data);

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function createInstructorAccount(data) {
  const response = await apiClient.post(
    `${INSTRUCTORS_ENDPOINT}/accounts`,
    data,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function updateInstructor(id, data) {
  const response = await apiClient.patch(`${INSTRUCTORS_ENDPOINT}/${id}`, data);

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function deactivateInstructor(id) {
  const response = await apiClient.patch(
    `${INSTRUCTORS_ENDPOINT}/${id}/deactivate`,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function addInstructorCourse(id, data) {
  const response = await apiClient.post(
    `${INSTRUCTORS_ENDPOINT}/${id}/specialties`,
    data,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function deactivateInstructorCourse(id, courseId) {
  const response = await apiClient.patch(
    `${INSTRUCTORS_ENDPOINT}/${id}/specialties/${courseId}/deactivate`,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function getInstructorAvailability(id) {
  const response = await apiClient.get(
    `${INSTRUCTORS_ENDPOINT}/${id}/availability`,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function addInstructorAvailability(id, data) {
  const response = await apiClient.post(
    `${INSTRUCTORS_ENDPOINT}/${id}/availability`,
    data,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function updateInstructorAvailability(id, availabilityId, data) {
  const response = await apiClient.patch(
    `${INSTRUCTORS_ENDPOINT}/${id}/availability/${availabilityId}`,
    data,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function deactivateInstructorAvailability(id, availabilityId) {
  const response = await apiClient.patch(
    `${INSTRUCTORS_ENDPOINT}/${id}/availability/${availabilityId}/deactivate`,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function getInstructorBlocks(id) {
  const response = await apiClient.get(`${INSTRUCTORS_ENDPOINT}/${id}/blocks`);

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function addInstructorBlock(id, data) {
  const response = await apiClient.post(
    `${INSTRUCTORS_ENDPOINT}/${id}/blocks`,
    data,
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

export async function deleteInstructorBlock(id, blockId) {
  return apiClient.patch(`${INSTRUCTORS_ENDPOINT}/${id}/blocks/${blockId}`);
}

export async function checkInstructorAvailability(id, startsAt, endsAt) {
  const response = await apiClient.get(
    `${INSTRUCTORS_ENDPOINT}/${id}/check-availability`,
    {
      params: {
        startsAt,
        endsAt,
      },
    },
  );

  const payload = unwrap(response);
  return payload?.data ?? payload;
}

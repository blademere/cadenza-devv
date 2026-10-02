import { apiClient } from "@/core/api/apiClient";

const BASE_URL = "/instructors";

const COURSES_URL = "/courses";

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

export const instructorService = {
  async getCourses() {
    return apiClient.get(COURSES_URL);
  },

  async getInstructors(params = {}) {
    return apiClient.get(
      `${BASE_URL}${buildQuery(params)}`,
    );
  },

  async getInstructor(id) {
    return apiClient.get(`${BASE_URL}/${id}`);
  },

  async createInstructorAccount(data) {
    return apiClient.post(
      `${BASE_URL}/accounts`,
      data,
    );
  },

  async createInstructor(data) {
    return apiClient.post(
      BASE_URL,
      data,
    );
  },

  async updateInstructor(id, data) {
    return apiClient.patch(
      `${BASE_URL}/${id}`,
      data,
    );
  },

  async deactivateInstructor(id) {
    return apiClient.patch(
      `${BASE_URL}/${id}/deactivate`,
    );
  },

  async getAvailability(id) {
    return apiClient.get(
      `${BASE_URL}/${id}/availability`,
    );
  },

  async addAvailability(id, data) {
    return apiClient.post(
      `${BASE_URL}/${id}/availability`,
      data,
    );
  },

  async updateAvailability(
    id,
    availabilityId,
    data,
  ) {
    return apiClient.patch(
      `${BASE_URL}/${id}/availability/${availabilityId}`,
      data,
    );
  },

  async deleteAvailability(
    id,
    availabilityId,
  ) {
    return apiClient.delete(
      `${BASE_URL}/${id}/availability/${availabilityId}`,
    );
  },

  async getBlocks(id) {
    return apiClient.get(
      `${BASE_URL}/${id}/blocks`,
    );
  },

  async addBlock(id, data) {
    return apiClient.post(
      `${BASE_URL}/${id}/blocks`,
      data,
    );
  },

  async deleteBlock(id, blockId) {
    return apiClient.delete(
      `${BASE_URL}/${id}/blocks/${blockId}`,
    );
  },

  async checkAvailability(
    id,
    startsAt,
    endsAt,
  ) {
    return apiClient.get(
      `${BASE_URL}/${id}/check-availability${buildQuery(
        {
          startsAt,
          endsAt,
        },
      )}`,
    );
  },
};

import { apiClient } from '@/core/api/apiClient';

const ENROLLMENT_PACKAGES_URL =
  '/enrollment-packages';

const unwrap = (response) =>
  response.data?.data ?? response.data;

export const getEnrollmentPackages = async (
  params = {},
) => {
  return unwrap(
    await apiClient.get(
      ENROLLMENT_PACKAGES_URL,
      {
        params,
      },
    ),
  );
};

export const getEnrollmentPackage = async (
  id,
) => {
  return unwrap(
    await apiClient.get(
      `${ENROLLMENT_PACKAGES_URL}/${id}`,
    ),
  );
};

export const createEnrollmentPackage = async (
  data,
) => {
  return unwrap(
    await apiClient.post(
      ENROLLMENT_PACKAGES_URL,
      data,
    ),
  );
};

export const updateEnrollmentPackage = async (
  id,
  data,
) => {
  return unwrap(
    await apiClient.patch(
      `${ENROLLMENT_PACKAGES_URL}/${id}`,
      data,
    ),
  );
};

export const deactivateEnrollmentPackage = async (
  id,
) => {
  return unwrap(
    await apiClient.patch(
      `${ENROLLMENT_PACKAGES_URL}/${id}/deactivate`,
      {},
    ),
  );
};
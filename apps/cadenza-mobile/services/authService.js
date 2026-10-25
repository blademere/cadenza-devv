import api from './api';
import {
  getAccount,
  getCsrfToken,
  getToken,
  logout as clearLocalAuth,
} from './authStorage';

export const MOCK_INSTRUCTOR_CREDENTIALS = {
  email: 'instructor@example.com',
  password: '112233445566',
};

const USE_MOCK_INSTRUCTOR =
  process.env.EXPO_PUBLIC_MOBILE_USE_MOCK_INSTRUCTOR === 'true';

function createMockInstructorSession() {
  return {
    accessToken: 'mock-instructor-access-token',
    csrfToken: '',
    user: {
      id: 'mock-instructor-user',
      email: MOCK_INSTRUCTOR_CREDENTIALS.email,
      emailVerified: true,
      isMock: true,
    },
    account: {
      id: 'mock-instructor-account',
      type: 'STAFF',
      staffType: 'INSTRUCTOR',
      instructorId: 'mock-instructor',
      status: 'ACTIVE',
      isMock: true,
      person: {
        id: 'mock-instructor-person',
        firstName: 'Mia',
        lastName: 'Santos',
        email: MOCK_INSTRUCTOR_CREDENTIALS.email,
        phone: '+639000000123',
      },
    },
  };
}

function createIdempotencyKey() {
  return `mobile-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function login(email, password) {
  if (
    USE_MOCK_INSTRUCTOR &&
    email.trim().toLowerCase() === MOCK_INSTRUCTOR_CREDENTIALS.email &&
    password === MOCK_INSTRUCTOR_CREDENTIALS.password
  ) {
    return createMockInstructorSession();
  }

  const response = await api.post('/auth/login', {
    email,
    password,
  });

  return response.data?.data ?? response.data;
}

export async function loginWithGoogle(accessToken) {
  const response = await api.post('/auth/oauth/google', { accessToken });
  return response.data?.data ?? response.data;
}

export async function getMe() {
  const response = await api.get('/auth/me');

  return response.data?.data ?? response.data;
}

export async function logout() {
  try {
    const account = await getAccount();
    const token = await getToken();

    if (token && !account?.isMock) {
      const csrfToken = await getCsrfToken();
      const response = await api.post(
        '/auth/logout',
        {},
        {
          timeout: 5000,
          headers: {
            'Idempotency-Key': createIdempotencyKey(),
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
        },
      );

      return response.data?.data ?? response.data;
    }
  } catch (error) {
    console.warn('Backend logout failed; clearing the local session.', error);
  } finally {
    await clearLocalAuth();
  }
}

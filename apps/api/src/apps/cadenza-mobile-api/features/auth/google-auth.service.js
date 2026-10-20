import crypto from 'node:crypto';

import { AppError, UnauthorizedError } from '../../../../common/errors/appError.js';
import { createAccessToken, createRefreshToken, hashToken } from '../../../../features/auth/auth.tokens.js';
import { createRefreshTokenRecord } from '../../../../features/auth/auth.repository.js';
import { env } from '../../../../config/index.js';
import { cadenzaAuthRepository } from '../../../cadenza-client/features/auth/auth.repository.js';

const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_TIMEOUT_MS = 5000;

const getAllowedGoogleAudiences = () =>
  (env.OAUTH_GOOGLE_MOBILE_CLIENT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const verifyGoogleIdToken = async (idToken) => {
  const allowedAudiences = getAllowedGoogleAudiences();

  if (!allowedAudiences.length) {
    throw new AppError(
      'Google sign-in is not configured on the server.',
      503,
    );
  }

  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 8192) {
    throw new UnauthorizedError('Google sign-in could not be verified.');
  }

  let response;

  try {
    response = await fetch(GOOGLE_TOKEN_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken }),
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
  } catch {
    throw new AppError(
      'Google verification is temporarily unavailable. Please try again.',
      503,
    );
  }

  if (!response.ok) {
    throw new UnauthorizedError('Google sign-in could not be verified.');
  }

  const claims = await response.json();
  const expiresAt = Number(claims.exp);
  const issuerIsValid = [
    'accounts.google.com',
    'https://accounts.google.com',
  ].includes(claims.iss);
  const audienceIsValid = allowedAudiences.includes(claims.aud);

  if (
    !claims.sub ||
    !claims.email ||
    !['true', true].includes(claims.email_verified) ||
    !issuerIsValid ||
    !audienceIsValid ||
    !Number.isFinite(expiresAt) ||
    expiresAt * 1000 <= Date.now()
  ) {
    throw new UnauthorizedError('Google sign-in could not be verified.');
  }

  return {
    googleSubject: String(claims.sub),
    email: String(claims.email).trim().toLowerCase(),
  };
};

const getRefreshTokenExpiration = () => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.');
  }

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + Number(match[1]) * multipliers[match[2]]);
};

const loginWithGoogleIdToken = async ({ idToken }) => {
  const identity = await verifyGoogleIdToken(idToken);
  const user = await cadenzaAuthRepository.findUserByEmail(identity.email);

  // Google sign-in is authentication only. Never create users, people,
  // customer records, instructor records, or OAuth links from this endpoint.
  if (!user || !user.isActive) {
    throw new UnauthorizedError(
      'No eligible existing Cadenza account was found for this Google email.',
    );
  }

  const application = await cadenzaAuthRepository.findApplication();

  if (!application || !application.isActive) {
    throw new UnauthorizedError('Cadenza application is unavailable.');
  }

  const staff = await cadenzaAuthRepository.findStaffByUserIdAndAppId(
    user.id,
    application.id,
  );

  let account;

  if (staff) {
    if (
      staff.status !== 'ACTIVE' ||
      String(staff.staffType || '').toUpperCase() !== 'INSTRUCTOR'
    ) {
      throw new UnauthorizedError(
        'Only active registered instructors can sign in to the mobile app.',
      );
    }

    account = {
      type: 'STAFF',
      id: staff.id,
      status: staff.status,
      staffType: staff.staffType,
      person: staff.person,
    };
  } else {
    const instructor =
      await cadenzaAuthRepository.findInstructorByUserIdAndAppId(
        user.id,
        application.id,
      );

    if (instructor) {
      if (instructor.status !== 'ACTIVE') {
        throw new UnauthorizedError('Cadenza instructor account is inactive.');
      }

      account = {
        type: 'STAFF',
        id: instructor.id,
        status: instructor.status,
        staffType: 'INSTRUCTOR',
        person: instructor.person,
      };
    } else {
      const customer =
        await cadenzaAuthRepository.findCustomerByUserIdAndAppId(
          user.id,
          application.id,
        );

      if (!customer || customer.status !== 'ACTIVE') {
        throw new UnauthorizedError(
          'No eligible existing Cadenza account was found for this Google email.',
        );
      }

      const activeEnrollment =
        await cadenzaAuthRepository.findActiveEnrollmentByCustomerId(
          customer.id,
        );

      if (!activeEnrollment) {
        throw new UnauthorizedError(
          'An approved enrollment is required for mobile access.',
        );
      }

      account = {
        type: 'CLIENT',
        id: customer.id,
        status: customer.status,
        person: {
          ...customer.person,
          activeEnrollment,
        },
        hasActiveEnrollment: true,
        activeEnrollment,
      };
    }
  }

  const tokenId = crypto.randomUUID();
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user, tokenId);

  await createRefreshTokenRecord({
    tokenId,
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: getRefreshTokenExpiration(),
  });

  const activeEnrollment = account.activeEnrollment;

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    account: {
      type: account.type,
      id: account.id,
      status: account.status,
      ...(account.type === 'STAFF'
        ? { staffType: account.staffType }
        : {}),
      ...(account.type === 'CLIENT'
        ? {
            hasActiveEnrollment: true,
            activeEnrollment: activeEnrollment
              ? {
                  id: activeEnrollment.id,
                  lessonPackageId: activeEnrollment.lessonPackageId,
                  status: activeEnrollment.status,
                  enrolledAt: activeEnrollment.enrolledAt,
                }
              : null,
          }
        : {}),
      person: {
        id: account.person.id,
        firstName: account.person.firstName,
        lastName: account.person.lastName,
        email: account.person.email,
        phone: account.person.phone,
      },
    },
  };
};

export { loginWithGoogleIdToken };

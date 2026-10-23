import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

import {
  ConflictError,
  BadRequestError,
  UnauthorizedError,
} from '../../../../common/errors/appError.js';

import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../../../../features/auth/auth.tokens.js';

import {
  createRefreshTokenRecord,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
} from '../../../../features/auth/auth.repository.js';

import { env } from '../../../../config/index.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { sendEmail } from '../../../../infrastructure/email/index.js';

import { cadenzaAuthRepository } from './auth.repository.js';

const prisma = getPrismaClient();

const createTokenId = () => crypto.randomUUID();

const getRefreshTokenExpiration = () => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.');
  }

  const milliseconds = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + Number(match[1]) * milliseconds[match[2]]);
};

const getAccount = async (
  userId,
  appId,
  { requireActiveEnrollment = false } = {},
) => {
  const staff = await cadenzaAuthRepository.findStaffByUserIdAndAppId(
    userId,
    appId,
  );

  if (staff) {
    if (staff.status !== 'ACTIVE') {
      throw new UnauthorizedError('Cadenza staff account is inactive.');
    }

    return {
      type: 'STAFF',
      id: staff.id,
      status: staff.status,
      staffType: staff.staffType,
      person: staff.person,
    };
  }

  const instructor =
    await cadenzaAuthRepository.findInstructorByUserIdAndAppId(
      userId,
      appId,
    );

  if (instructor) {
    if (instructor.status !== 'ACTIVE') {
      throw new UnauthorizedError('Cadenza instructor account is inactive.');
    }

    return {
      type: 'INSTRUCTOR',
      id: instructor.id,
      status: instructor.status,
      instructorId: instructor.id,
      person: instructor.person,
    };
  }

  const customer = await cadenzaAuthRepository.findCustomerByUserIdAndAppId(
    userId,
    appId,
  );

  if (customer) {
    if (customer.status !== 'ACTIVE') {
      throw new UnauthorizedError('Cadenza client account is inactive.');
    }

    const activeEnrollment = await cadenzaAuthRepository.findActiveEnrollmentByCustomerId(
      customer.id,
    );

    if (requireActiveEnrollment && !activeEnrollment) {
      throw new UnauthorizedError(
        'An approved enrollment is required for mobile access.',
      );
    }

    return {
      type: 'CLIENT',
      id: customer.id,
      status: customer.status,
      person: customer.person,
      activeEnrollment,
    };
  }

  throw new UnauthorizedError('Cadenza account not found.');
};

const formatAccount = (account) => ({
  type: account.type,
  id: account.id,
  status: account.status,
  ...(account.type === 'STAFF'
    ? {
        staffType: account.staffType,
      }
    : {}),
  ...(account.type === 'INSTRUCTOR'
    ? {
        instructorId: account.instructorId,
      }
    : {}),
  ...(account.type === 'CLIENT'
    ? {
        hasActiveEnrollment: Boolean(account.activeEnrollment),
        activeEnrollment: account.activeEnrollment
          ? {
              id: account.activeEnrollment.id,
              lessonPackageId: account.activeEnrollment.lessonPackageId,
              status: account.activeEnrollment.status,
              enrolledAt: account.activeEnrollment.enrolledAt,
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
});

const login = async (
  { email, password },
  { requireActiveEnrollment = false } = {},
) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new BadRequestError('Email and password are required.');
  }

  const user = await cadenzaAuthRepository.findUserByEmail(normalizedEmail);

  if (!user || !user.isActive || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials.');
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    throw new UnauthorizedError('Invalid credentials.');
  }

  const application = await cadenzaAuthRepository.findApplication();

  if (!application || !application.isActive) {
    throw new UnauthorizedError('Cadenza application is unavailable.');
  }

  const account = await getAccount(user.id, application.id, {
    requireActiveEnrollment,
  });

  const tokenId = createTokenId();

  const accessToken = createAccessToken(user);

  const refreshToken = createRefreshToken(user, tokenId);

  await createRefreshTokenRecord({
    tokenId,
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: getRefreshTokenExpiration(),
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    account: formatAccount(account),
  };
};

const registerClient = async ({ email, password }) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new BadRequestError('Email and password are required.');
  }

  if (await cadenzaAuthRepository.findUserByEmail(normalizedEmail)) {
    throw new ConflictError('An account with this email already exists.');
  }

  const application = await cadenzaAuthRepository.findApplication();
  if (!application || !application.isActive) {
    throw new BadRequestError('Cadenza application is unavailable.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const firstName = normalizedEmail.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Cadenza';

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: normalizedEmail, passwordHash },
        select: { id: true, email: true, emailVerifiedAt: true },
      });
      const person = await tx.person.create({
        data: { userId: user.id, firstName, lastName: 'Client', email: normalizedEmail },
      });
      const customer = await tx.cadenzaCustomer.create({
        data: { appId: application.id, personId: person.id, status: 'ACTIVE' },
      });
      return { user, customer };
    });

    return {
      user: { id: result.user.id, email: result.user.email, emailVerified: Boolean(result.user.emailVerifiedAt) },
      account: { type: 'CLIENT', id: result.customer.id, status: result.customer.status },
    };
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('An account with this email already exists.');
    throw error;
  }
};

const refreshAccessToken = async ({
  refreshToken,
  requireActiveEnrollment = false,
}) => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token is invalid or expired.');
  }

  if (
    payload.type !== 'refresh' ||
    !payload.sub ||
    !payload.tokenId ||
    !Number.isInteger(payload.authVersion) ||
    payload.authVersion < 0
  ) {
    throw new UnauthorizedError('Refresh token is invalid.');
  }

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new UnauthorizedError('Refresh token is invalid.');
  }

  const storedToken = await findRefreshToken(hashToken(refreshToken));

  if (
    !storedToken ||
    storedToken.id !== payload.tokenId ||
    storedToken.userId !== userId
  ) {
    throw new UnauthorizedError('Refresh token is invalid.');
  }

  if (storedToken.user.authVersion !== payload.authVersion) {
    await revokeAllRefreshTokensForUser(userId);

    throw new UnauthorizedError('Refresh token has been revoked.');
  }

  if (storedToken.revokedAt) {
    await revokeAllRefreshTokensForUser(userId);

    throw new UnauthorizedError('Refresh token has already been used.');
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new UnauthorizedError('Refresh token is expired.');
  }

  if (!storedToken.user.isActive) {
    throw new UnauthorizedError('User account is inactive.');
  }

  const application = await cadenzaAuthRepository.findApplication();

  if (!application || !application.isActive) {
    throw new UnauthorizedError('Cadenza application is unavailable.');
  }

  const account = await getAccount(userId, application.id, {
    requireActiveEnrollment,
  });

  const newTokenId = createTokenId();

  const newRefreshToken = createRefreshToken(storedToken.user, newTokenId);

  const rotation = await rotateRefreshToken({
    currentTokenId: storedToken.id,
    newTokenId,
    newTokenHash: hashToken(newRefreshToken),
    userId: storedToken.user.id,
    expiresAt: getRefreshTokenExpiration(),
  });

  if (!rotation.success) {
    await revokeAllRefreshTokensForUser(userId);

    throw new UnauthorizedError('Refresh token has already been used.');
  }

  return {
    accessToken: createAccessToken(storedToken.user),
    refreshToken: newRefreshToken,
    account: formatAccount(account),
  };
};

const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    return;
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return;
  }

  if (payload.type !== 'refresh' || !payload.tokenId) {
    return;
  }

  const storedToken = await findRefreshToken(hashToken(refreshToken));

  if (
    !storedToken ||
    storedToken.id !== payload.tokenId ||
    storedToken.revokedAt
  ) {
    return;
  }

  await revokeRefreshToken(storedToken.id);
};

const getCurrentUser = async (
  userId,
  { requireActiveEnrollment = false } = {},
) => {
  const application = await cadenzaAuthRepository.findApplication();

  if (!application || !application.isActive) {
    throw new UnauthorizedError('Cadenza application is unavailable.');
  }

  const account = await getAccount(userId, application.id, {
    requireActiveEnrollment,
  });

  return {
    user: {
      id: account.person.user.id,
      email: account.person.user.email,
      emailVerified: Boolean(account.person.user.emailVerifiedAt),
    },
    account: formatAccount(account),
  };
};

const OTP_TTL_MS = 10 * 60 * 1000;
const createOtp = () => String(crypto.randomInt(100000, 1000000));
const otpHash = (email, otp) => hashToken(`cadenza-email-otp:${email}:${otp}`);

const requestEmailOtp = async ({ email, purpose, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const application = await cadenzaAuthRepository.findApplication();
  if (!application || !application.isActive) throw new BadRequestError('Cadenza application is unavailable.');

  let user = await cadenzaAuthRepository.findUserByEmail(normalizedEmail);
  if (purpose === 'signup') {
    if (user && (user.passwordHash || user.emailVerifiedAt)) throw new ConflictError('An account with this email already exists.');
    if (!user) user = await prisma.user.create({ data: { email: normalizedEmail, passwordHash: null } });
  } else if (!user || !user.isActive) {
    throw new UnauthorizedError('No active account was found for this email.');
  } else {
    if (!user.passwordHash || typeof password !== 'string' ||
        !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid credentials.');
    }
    const account = await getAccount(user.id, application.id);
    if (account.type !== 'CLIENT') {
      throw new UnauthorizedError('Invalid credentials.');
    }
  }

  const otp = createOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.emailVerificationToken.create({ data: { id: crypto.randomUUID(), userId: user.id, tokenHash: otpHash(normalizedEmail, otp), expiresAt } });
  });

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: 'Your Cadenza verification code',
      text: `Your Cadenza verification code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your Cadenza verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (error) {
    if (purpose === 'signup' && !user.emailVerifiedAt && !user.passwordHash) await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    throw error;
  }

  return { email: normalizedEmail, expiresAt };
};

const verifyEmailOtp = async ({ email, otp, purpose }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: otpHash(normalizedEmail, otp) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt <= new Date() || record.user.email !== normalizedEmail) throw new UnauthorizedError('The verification code is invalid or expired.');
  if (!record.user.isActive) throw new UnauthorizedError('This account is inactive.');

  const application = await cadenzaAuthRepository.findApplication();
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
    if (purpose === 'signup') {
      const person = await tx.person.findUnique({ where: { userId: record.userId } });
      const ensuredPerson = person || await tx.person.create({ data: { userId: record.userId, firstName: normalizedEmail.split('@')[0], lastName: 'Client', email: normalizedEmail } });
      const customer = await tx.cadenzaCustomer.findFirst({ where: { appId: application.id, personId: ensuredPerson.id }, select: { id: true } });
      if (!customer) await tx.cadenzaCustomer.create({ data: { appId: application.id, personId: ensuredPerson.id, status: 'ACTIVE' } });
    }
  });

  const account = await getAccount(record.userId, application.id);
  const tokenId = createTokenId();
  const refreshToken = createRefreshToken(record.user, tokenId);
  await createRefreshTokenRecord({ tokenId, tokenHash: hashToken(refreshToken), userId: record.userId, expiresAt: getRefreshTokenExpiration() });
  return { accessToken: createAccessToken(record.user), refreshToken, user: { id: record.user.id, email: record.user.email, emailVerified: true }, account: formatAccount(account) };
};

export { login, registerClient, refreshAccessToken, logout, getCurrentUser, requestEmailOtp, verifyEmailOtp };

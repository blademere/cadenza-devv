import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

import {
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

import { cadenzaAuthRepository } from './auth.repository.js';

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

const getAccount = async (userId, appId) => {
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

  const customer = await cadenzaAuthRepository.findCustomerByUserIdAndAppId(
    userId,
    appId,
  );

  if (customer) {
    if (customer.status !== 'ACTIVE') {
      throw new UnauthorizedError('Cadenza client account is inactive.');
    }

    return {
      type: 'CLIENT',
      id: customer.id,
      status: customer.status,
      person: customer.person,
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
  person: {
    id: account.person.id,
    firstName: account.person.firstName,
    lastName: account.person.lastName,
    email: account.person.email,
    phone: account.person.phone,
  },
});

const login = async ({ email, password }) => {
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

  const account = await getAccount(user.id, application.id);

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

const refreshAccessToken = async ({ refreshToken }) => {
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

  const account = await getAccount(userId, application.id);

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

const getCurrentUser = async (userId) => {
  const application = await cadenzaAuthRepository.findApplication();

  if (!application || !application.isActive) {
    throw new UnauthorizedError('Cadenza application is unavailable.');
  }

  const account = await getAccount(userId, application.id);

  return {
    user: {
      id: account.person.user.id,
      email: account.person.user.email,
      emailVerified: Boolean(account.person.user.emailVerifiedAt),
    },
    account: formatAccount(account),
  };
};

export { login, refreshAccessToken, logout, getCurrentUser };

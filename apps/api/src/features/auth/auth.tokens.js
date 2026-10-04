import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/index.js';

const JWT_ISSUER = 'cadenza-app';
const JWT_AUDIENCE = 'api';
const MAX_APP_ID_LENGTH = 128;

const normalizeAppId = (appId) => {
  if (appId === undefined || appId === null) return null;
  if (typeof appId !== 'string')
    throw new TypeError('Application id must be a string.');
  const normalized = appId.trim();
  if (!normalized || normalized.length > MAX_APP_ID_LENGTH)
    throw new TypeError('Application id is invalid.');
  return normalized;
};

const buildApplicationClaim = (appId) => {
  const normalizedAppId = normalizeAppId(appId);
  return normalizedAppId ? { appId: normalizedAppId } : {};
};

const createAccessToken = (user, appId = null) =>
  jwt.sign(
    {
      type: 'access',
      authVersion: Number(user.authVersion ?? 0),
      ...buildApplicationClaim(appId),
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );

const createRefreshToken = (user, tokenId, appId = null) =>
  jwt.sign(
    {
      type: 'refresh',
      tokenId,
      authVersion: Number(user.authVersion ?? 0),
      ...buildApplicationClaim(appId),
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );

const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  normalizeAppId,
};

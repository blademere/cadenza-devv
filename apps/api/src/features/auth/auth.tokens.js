import jwt from 'jsonwebtoken'
import { env } from '../../config/index.js'

const JWT_ISSUER = 'express-app'
const JWT_AUDIENCE = 'api'

const createAccessToken = (user) => jwt.sign({ type: 'access', authVersion: Number(user.authVersion ?? 0) }, env.JWT_ACCESS_SECRET, { subject: String(user.id), expiresIn: env.JWT_ACCESS_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
const createRefreshToken = (user, tokenId) => jwt.sign({ type: 'refresh', tokenId, authVersion: Number(user.authVersion ?? 0) }, env.JWT_REFRESH_SECRET, { subject: String(user.id), expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })

export { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken }

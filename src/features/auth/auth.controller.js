const { successResponse } = require("../../common/responses/apiResponse")

const { login, refreshAccessToken, logout } = require("./auth.service")

const { setCsrfCookie } = require("../../common/middleware/csrf")

const { UnauthorizedError } = require("../../common/errors/appError")

const { env } = require("../../config")

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/api/auth",
  })
}

const loginController = async (req, res) => {
  const result = await login(req.validated.body)
  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions)
  const csrfToken = setCsrfCookie(res)

  return successResponse(
    res,
    "Login successful.",
    {
      accessToken: result.accessToken,
      csrfToken,
      user: result.user,
    },
    200,
  )
}

const refreshAccessTokenController = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken

  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token is missing.")
  }

  const result = await refreshAccessToken({
    refreshToken,
  })

  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions)

  return successResponse(res, "Access token refreshed.", {
    accessToken: result.accessToken,
  })
}

const logoutController = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken

  await logout({
    refreshToken,
  })

  clearRefreshCookie(res)

  res.clearCookie("csrfToken", {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  })

  return successResponse(res, "Logout successful.", null, 200)
}

module.exports = {
  loginController,
  refreshAccessTokenController,
  logoutController,
}

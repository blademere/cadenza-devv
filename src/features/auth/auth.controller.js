const { successResponse } = require("../../common/responses/apiResponse");
const { login, refreshAccessToken } = require("./auth.service");

const loginController = async (req, res) => {
  const result = await login(req.validated.body);
  return successResponse(res, "Login successful.", result, 200);
};

const refreshController = async (req, res) => {
  const result = await refreshAccessToken(req.validated.body);
  return successResponse(res, "Token refreshed successfully.", result, 200);
};

module.exports = {
  loginController,
  refreshController,
};

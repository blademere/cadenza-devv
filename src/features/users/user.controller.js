const { successResponse } = require("../../common/responses/apiResponse");
const { listUsers, registerUser } = require("./user.service");

const listUsersController = async (req, res) => {
  const result = await listUsers(req.validated.query);
  return res.status(200).json({
    success: true,
    message: "Users retrieved successfully.",
    data: result.data,
    pagination: result.pagination,
  });
};

const createUserController = async (req, res) => {
  const user = await registerUser({
    requesterId: req.user.id,
    ...req.validated.body,
  });
  return successResponse(res, "User created successfully.", user, 201);
};

module.exports = {
  listUsersController,
  createUserController,
};

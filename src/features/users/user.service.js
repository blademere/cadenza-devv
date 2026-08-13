const bcrypt = require("bcrypt")

const { ConflictError, NotFoundError } = require("../../common/errors/appError")

const { findAllUsers, createUser } = require("./user.repository")

const { toUserResponse } = require("./user.mapper")

const { findUserByEmail } = require("../auth/auth.repository")

const { findRoleById } = require("../rbac/rbac.repository")

const listUsers = async ({ page, limit }) => {
  const skip = (page - 1) * limit

  const { users, total } = await findAllUsers({
    skip,
    take: limit,
  })

  const data = users.map(toUserResponse)

  return {
    data,

    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

const registerUser = async ({ email, roleId, password }) => {
  const existingUser = await findUserByEmail(email)

  if (existingUser) {
    throw new ConflictError("A user with this email already exists.")
  }

  const role = await findRoleById(roleId)

  if (!role) {
    throw new NotFoundError("Role not found.")
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await createUser({
    email,
    roleId,
    passwordHash,
  })

  return toUserResponse(user)
}

module.exports = {
  listUsers,
  registerUser,
}

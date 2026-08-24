const toUserResponse = (user) => {
  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,

    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          description: user.role.description,
        }
      : null,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

module.exports = {
  toUserResponse,
}

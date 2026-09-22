const toUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  isActive: user.isActive,
  roles: (user.roles ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
  })),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export { toUserResponse }

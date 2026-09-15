const mapApplication = (app) => app && ({
  id: app.id,
  key: app.key,
  name: app.name,
  description: app.description,
  isActive: app.isActive,
})

const mapMembership = (membership) => membership && ({
  id: membership.id,
  app: mapApplication(membership.app),
  userId: membership.userId,
  isActive: membership.isActive,
  roles: (membership.roles ?? []).map(({ role }) => ({
    id: role.id,
    name: role.name,
    description: role.description,
  })),
})

export { mapApplication, mapMembership }

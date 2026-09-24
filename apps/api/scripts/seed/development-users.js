const ensureAppRole = async (prisma, { userId, appKey, roleId }) => {
  const app = await prisma.app.findUnique({ where: { key: appKey } })
  if (!app) throw new Error("Application '" + appKey + "' must be seeded before development users.")
  const membership = await prisma.appMembership.upsert({
    where: { appId_userId: { appId: app.id, userId } },
    update: { isActive: true },
    create: { appId: app.id, userId },
  })
  await prisma.appMembershipRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId } },
    update: {},
    create: { membershipId: membership.id, roleId },
  })
}

const ensurePerson = async (prisma, { userId, firstName, lastName, email, phone }) => prisma.person.upsert({
  where: { userId },
  update: { firstName, lastName, email, phone, isActive: true },
  create: { userId, firstName, lastName, email, phone },
})

export { ensurePerson, ensureAppRole }

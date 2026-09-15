const OBO_APP_KEY = 'obo'

async function seedAppMemberships(prisma) {
  const app = await prisma.app.findUnique({ where: { key: OBO_APP_KEY } })
  if (!app) throw new Error(`Platform application '${OBO_APP_KEY}' must be seeded before app memberships.`)

  const users = await prisma.user.findMany({
    where: { roleId: { not: null } },
    select: { id: true, email: true, roleId: true },
  })

  let createdMembershipRoles = 0

  for (const user of users) {
    const membership = await prisma.appMembership.upsert({
      where: { appId_userId: { appId: app.id, userId: user.id } },
      update: {},
      create: { appId: app.id, userId: user.id },
    })

    const existingRole = await prisma.appMembershipRole.findUnique({
      where: {
        membershipId_roleId: {
          membershipId: membership.id,
          roleId: user.roleId,
        },
      },
    })

    if (!existingRole) {
      await prisma.appMembershipRole.create({
        data: {
          membershipId: membership.id,
          roleId: user.roleId,
        },
      })
      createdMembershipRoles += 1
    }
  }

  const verification = await prisma.appMembership.findMany({
    where: { appId: app.id },
    select: {
      userId: true,
      isActive: true,
      roles: { select: { roleId: true } },
    },
  })

  const membershipByUserId = new Map(verification.map((membership) => [membership.userId, membership]))

  for (const user of users) {
    const membership = membershipByUserId.get(user.id)
    if (!membership) {
      throw new Error(`App membership migration failed for user ${user.id} (${user.email}).`)
    }
    if (!membership.roles.some((role) => role.roleId === user.roleId)) {
      throw new Error(`App membership role migration failed for user ${user.id} (${user.email}).`)
    }
  }

  console.log(`OBO app memberships verified: ${users.length} legacy user role assignment(s) mapped to app memberships; ${createdMembershipRoles} membership role assignment(s) created.`)

  return {
    app,
    userCount: users.length,
    membershipCount: verification.length,
    createdMembershipRoles,
  }
}

export { OBO_APP_KEY, seedAppMemberships }

const OBO_APP_KEY = 'obo'

async function seedAppMemberships(prisma) {
  const app = await prisma.app.findUnique({ where: { key: OBO_APP_KEY } })
  if (!app) throw new Error(`Platform application '${OBO_APP_KEY}' must be seeded before app memberships.`)

  const users = await prisma.user.findMany({
    select: { id: true, email: true, roleId: true },
  })

  const usersWithRoles = users.filter((user) => user.roleId !== null && user.roleId !== undefined)
  let createdMemberships = 0
  let createdMembershipRoles = 0

  for (const user of usersWithRoles) {
    const existingMembership = await prisma.appMembership.findUnique({
      where: { appId_userId: { appId: app.id, userId: user.id } },
    })

    const membership = existingMembership || await prisma.appMembership.create({
      data: { appId: app.id, userId: user.id },
    })

    if (!existingMembership) createdMemberships += 1

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

  for (const user of usersWithRoles) {
    const membership = membershipByUserId.get(user.id)
    if (!membership) {
      throw new Error(`App membership migration failed for user ${user.id} (${user.email}).`)
    }
    if (!membership.roles.some((role) => role.roleId === user.roleId)) {
      throw new Error(`App membership role migration failed for user ${user.id} (${user.email}).`)
    }
  }

  console.log(`OBO app memberships verified: ${usersWithRoles.length} legacy user role assignment(s) mapped to app memberships; ${createdMemberships} membership(s) and ${createdMembershipRoles} membership role assignment(s) created.`)

  return {
    app,
    userCount: usersWithRoles.length,
    membershipCount: verification.length,
    createdMemberships,
    createdMembershipRoles,
  }
}

export { OBO_APP_KEY, seedAppMemberships }

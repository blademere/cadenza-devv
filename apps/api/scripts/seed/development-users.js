import bcrypt from 'bcrypt'

const ensureUser = async (prisma, { email, roleId, passwordHash }) => {
  const user = await prisma.user.upsert({
    where: { email },
    update: { isActive: true, ...(passwordHash ? { passwordHash } : {}) },
    create: { email, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  })

  if (roleId) {
    const app = await prisma.app.findUnique({ where: { key: 'obo' } })
    if (!app) throw new Error("Application 'obo' must be seeded before development users.")
    const membership = await prisma.appMembership.upsert({
      where: { appId_userId: { appId: app.id, userId: user.id } },
      update: { isActive: true },
      create: { appId: app.id, userId: user.id },
    })
    await prisma.appMembershipRole.upsert({
      where: { membershipId_roleId: { membershipId: membership.id, roleId } },
      update: {},
      create: { membershipId: membership.id, roleId },
    })
  }
  return user
}

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

async function seedDevelopmentUsers(prisma, { roles }) {
  const demoPasswordHash = process.env.SEED_DEMO_PASSWORD
    ? await bcrypt.hash(process.env.SEED_DEMO_PASSWORD, 12)
    : null

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const admin = await ensureUser(prisma, { email: adminEmail, roleId: roles.admin.id, passwordHash })
    await ensureAppRole(prisma, { userId: admin.id, appKey: 'cadenza', roleId: roles.cadenza_admin.id })
    await ensurePerson(prisma, { userId: admin.id, firstName: 'System', lastName: 'Administrator', email: admin.email, phone: '+630000000000' })
    console.log('Development admin ensured for OBO and Cadenza: ' + adminEmail)
  } else {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
  }

  const cadenzaAdminEmail = process.env.SEED_CADENZA_ADMIN_EMAIL
  const cadenzaAdminPassword = process.env.SEED_CADENZA_ADMIN_PASSWORD
  if (cadenzaAdminEmail && cadenzaAdminPassword) {
    const passwordHash = await bcrypt.hash(cadenzaAdminPassword, 12)
    const cadenzaAdmin = await ensureUser(prisma, { email: cadenzaAdminEmail, passwordHash })
    await ensureAppRole(prisma, { userId: cadenzaAdmin.id, appKey: 'cadenza', roleId: roles.cadenza_admin.id })
    await ensurePerson(prisma, { userId: cadenzaAdmin.id, firstName: 'Cadenza', lastName: 'Administrator', email: cadenzaAdmin.email, phone: '+630000000001' })
    console.log('Cadenza development admin ensured: ' + cadenzaAdminEmail)
  } else {
    console.log('No Cadenza development admin configured; set SEED_CADENZA_ADMIN_EMAIL and SEED_CADENZA_ADMIN_PASSWORD to create one.')
  }

  return { demoPasswordHash }
}

export { seedDevelopmentUsers, ensureUser, ensurePerson, ensureAppRole }
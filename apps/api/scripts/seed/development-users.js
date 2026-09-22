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
  if (!adminEmail || !adminPassword) {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
    return { admin: null, demoPasswordHash }
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const admin = await ensureUser(prisma, { email: adminEmail, roleId: roles.admin.id, passwordHash })
  if (roles.cadenza_admin) {
    const cadenza = await prisma.app.findUnique({ where: { key: 'cadenza' } })
    const membership = await prisma.appMembership.upsert({ where: { appId_userId: { appId: cadenza.id, userId: admin.id } }, update: { isActive: true }, create: { appId: cadenza.id, userId: admin.id } })
    await prisma.appMembershipRole.upsert({ where: { membershipId_roleId: { membershipId: membership.id, roleId: roles.cadenza_admin.id } }, update: {}, create: { membershipId: membership.id, roleId: roles.cadenza_admin.id } })
  }
  await ensurePerson(prisma, { userId: admin.id, firstName: 'System', lastName: 'Administrator', email: admin.email, phone: '+630000000000' })
  console.log(`Development admin ensured: ${adminEmail}`)
  return { admin, demoPasswordHash }
}

export { seedDevelopmentUsers, ensureUser, ensurePerson }

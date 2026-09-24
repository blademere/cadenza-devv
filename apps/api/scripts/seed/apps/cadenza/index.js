import { seedCadenzaAuthorization } from './authorization.js'

async function ensureAppRole(prisma, { userId, appKey, roleId }) {
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

async function ensurePerson(prisma, { userId, firstName, lastName, email, phone }) {
  return prisma.person.upsert({
    where: { userId },
    update: { firstName, lastName, email, phone },
    create: { userId, firstName, lastName, email, phone },
  })
}

async function seedCadenzaDevelopmentUser(prisma, { roleId }) {
  const email = process.env.SEED_CADENZA_ADMIN_EMAIL
  const password = process.env.SEED_CADENZA_ADMIN_PASSWORD
  if (!email || !password) return null

  const bcrypt = await import('bcrypt')
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { isActive: true, passwordHash },
    create: { email, isActive: true, passwordHash },
  })
  await ensureAppRole(prisma, { userId: user.id, appKey: 'cadenza', roleId })
  await ensurePerson(prisma, {
    userId: user.id,
    firstName: 'Cadenza',
    lastName: 'Administrator',
    email: user.email,
    phone: '+630000000001',
  })
  console.log('Cadenza development admin ensured: ' + email)
  return user
}

async function seedCadenza(prisma, { profile = 'default' } = {}) {
  const cadenza = await prisma.app.findUnique({ where: { key: 'cadenza' } })
  if (!cadenza) throw new Error("Platform application 'cadenza' is missing. Run the platform seed first.")
  const { roles, permissionRecords } = await seedCadenzaAuthorization(prisma, cadenza)

  if (profile === 'development') {
    await seedCadenzaDevelopmentUser(prisma, { roleId: roles.cadenza_admin.id })
  }

  return { application: cadenza, roles, permissionRecords }
}

export { seedCadenza }

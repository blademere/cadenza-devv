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

const CADENZA_DEVELOPMENT_USERS = [
  { role: 'cadenza_client', email: 'cadenza-client@example.test', firstName: 'Cadenza', lastName: 'Client', phone: '+630000000001' },
  { role: 'cadenza_frontdesk', email: 'cadenza-frontdesk@example.test', firstName: 'Cadenza', lastName: 'Front Desk', phone: '+630000000002' },
  { role: 'cadenza_instructor', email: 'cadenza-instructor@example.test', firstName: 'Cadenza', lastName: 'Instructor', phone: '+630000000003' },
  { role: 'cadenza_admin', email: 'cadenza-admin@example.test', firstName: 'Cadenza', lastName: 'Administrator', phone: '+630000000004' },
]

async function seedCadenzaDevelopmentUsers(prisma, { roles }) {
  const bcrypt = await import('bcrypt')
  const passwordHash = await bcrypt.hash('112233445566', 12)

  for (const definition of CADENZA_DEVELOPMENT_USERS) {
    const role = roles[definition.role]
    if (!role) throw new Error("Cadenza role '" + definition.role + "' was not seeded.")

    const user = await prisma.user.upsert({
      where: { email: definition.email },
      update: { isActive: true, passwordHash },
      create: { email: definition.email, isActive: true, passwordHash },
    })

    await ensureAppRole(prisma, { userId: user.id, appKey: 'cadenza', roleId: role.id })
    await ensurePerson(prisma, {
      userId: user.id,
      firstName: definition.firstName,
      lastName: definition.lastName,
      email: definition.email,
      phone: definition.phone,
    })
  }

  console.log('Cadenza development users ensured for all four roles.')
}

async function seedCadenza(prisma, { profile = 'default' } = {}) {
  const cadenza = await prisma.app.findUnique({ where: { key: 'cadenza' } })
  if (!cadenza) throw new Error("Platform application 'cadenza' is missing. Run the platform seed first.")
  const { roles, permissionRecords } = await seedCadenzaAuthorization(prisma, cadenza)

  if (profile === 'development') {
    await seedCadenzaDevelopmentUsers(prisma, { roles })
  }

  return { application: cadenza, roles, permissionRecords }
}

export { CADENZA_DEVELOPMENT_USERS, seedCadenza, seedCadenzaDevelopmentUsers }

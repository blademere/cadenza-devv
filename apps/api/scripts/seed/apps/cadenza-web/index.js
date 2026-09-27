import bcrypt from 'bcrypt'
import { seedAuthorizationCatalog } from '../../authorization-core.js'

const APP_KEY = 'cadenza-web'
const catalog = {
  cadenza_staff: ['read', 'create', 'update'],
  cadenza_rooms: ['read', 'create', 'update'],
}
const roles = {
  cadenza_web_user: { permissions: ['cadenza_staff:read', 'cadenza_rooms:read'], description: 'Cadenza Web staff reader.' },
  cadenza_web_admin: { permissions: ['cadenza_staff:read', 'cadenza_staff:create', 'cadenza_staff:update', 'cadenza_rooms:read', 'cadenza_rooms:create', 'cadenza_rooms:update'], description: 'Cadenza Web staff administrator.' },
}

const users = [
  { role: 'cadenza_client', email: 'cadenza-client@example.test', firstName: 'Cadenza', lastName: 'Client', phone: '+630000000001' },
  { role: 'cadenza_frontdesk', email: 'cadenza-frontdesk@example.test', firstName: 'Cadenza', lastName: 'Front Desk', phone: '+630000000002' },
  { role: 'cadenza_instructor', email: 'cadenza-instructor@example.test', firstName: 'Cadenza', lastName: 'Instructor', phone: '+630000000003' },
  { role: 'cadenza_admin', email: 'cadenza-admin@example.test', firstName: 'Cadenza', lastName: 'Administrator', phone: '+630000000004' },
]

async function ensureMembership(prisma, { userId, appId, roleId }) {
  const membership = await prisma.appMembership.upsert({
    where: { appId_userId: { appId, userId } },
    update: { isActive: true },
    create: { appId, userId },
  })
  await prisma.appMembershipRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId } },
    update: {},
    create: { membershipId: membership.id, roleId },
  })
}

async function seedCadenzaWebDevelopmentUsers(prisma, application, seededRoles) {
  const passwordHash = await bcrypt.hash('112233445566', 12)
  for (const definition of users) {
    const user = await prisma.user.upsert({
      where: { email: definition.email },
      update: { isActive: true, passwordHash },
      create: { email: definition.email, isActive: true, passwordHash },
    })
    const roleId = definition.role === 'cadenza_admin' ? seededRoles.cadenza_web_admin.id : seededRoles.cadenza_web_user.id
    await ensureMembership(prisma, { userId: user.id, appId: application.id, roleId })
    await prisma.person.upsert({
      where: { userId: user.id },
      update: { firstName: definition.firstName, lastName: definition.lastName, email: definition.email, phone: definition.phone },
      create: { userId: user.id, firstName: definition.firstName, lastName: definition.lastName, email: definition.email, phone: definition.phone },
    })
  }
}

async function seedCadenzaWeb(prisma, { profile = 'default' } = {}) {
  const application = await prisma.app.findUnique({ where: { key: APP_KEY } })
  if (!application) throw new Error("Platform application 'cadenza-web' is missing. Run the platform seed first.")
  const authorization = await seedAuthorizationCatalog(prisma, { catalog, application, roles, cleanupPrefixes: ['cadenza_staff'] })
  if (profile === 'development') await seedCadenzaWebDevelopmentUsers(prisma, application, authorization.roles)
  return { application, ...authorization }
}

export { seedCadenzaWeb }

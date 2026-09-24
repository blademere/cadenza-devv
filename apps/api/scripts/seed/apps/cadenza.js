import { seedApplication } from '../applications.js'
import { seedAuthorization } from '../authorization.js'
import { ensureAppRole, ensurePerson } from '../development-users.js'

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
  const cadenza = await seedApplication(prisma, 'cadenza')
  const { roles, permissionRecords } = await seedAuthorization(prisma, {
    applications: { cadenza },
    applicationKeys: ['cadenza'],
  })

  if (profile === 'development') {
    await seedCadenzaDevelopmentUser(prisma, { roleId: roles.cadenza_admin.id })
  }

  return { application: cadenza, roles, permissionRecords }
}

export { seedCadenza }

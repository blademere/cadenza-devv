import bcrypt from 'bcrypt'

const ensureUser = async (prisma, { email, roleId, passwordHash }) => prisma.user.upsert({
  where: { email },
  update: { roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  create: { email, roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
})

async function seedDevelopmentUsers(prisma, { roles, demoPasswordHash = null }) {
  const users = {}

  if (demoPasswordHash) {
    users.client = await ensureUser(prisma, { email: 'obo-client@example.test', roleId: roles.client.id, passwordHash: demoPasswordHash })
    users.professional = await ensureUser(prisma, { email: 'obo-professional@example.test', roleId: roles.professional.id, passwordHash: demoPasswordHash })
    users.receivingOfficer = await ensureUser(prisma, { email: 'obo-receiving-officer@example.test', roleId: roles.receiving_officer.id, passwordHash: demoPasswordHash })
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
    return users
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  users.admin = await ensureUser(prisma, { email: adminEmail, roleId: roles.admin.id, passwordHash })
  console.log(`Development admin ensured: ${adminEmail}`)
  return users
}

export { seedDevelopmentUsers }

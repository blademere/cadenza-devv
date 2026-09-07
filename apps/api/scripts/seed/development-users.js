import bcrypt from 'bcrypt'

const ensureUser = async (prisma, { email, roleId, passwordHash }) => prisma.user.upsert({
  where: { email },
  update: { roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  create: { email, roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
})

async function seedDevelopmentUsers(prisma, { roles }) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
    return null
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const admin = await ensureUser(prisma, { email: adminEmail, roleId: roles.admin.id, passwordHash })
  console.log(`Development admin ensured: ${adminEmail}`)
  return admin
}

export { seedDevelopmentUsers }

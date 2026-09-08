import bcrypt from 'bcrypt'

const ensureUser = async (prisma, { email, roleId, passwordHash }) => prisma.user.upsert({
  where: { email },
  update: { roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  create: { email, roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
})

const ensurePerson = async (prisma, { userId, firstName, lastName, email, phone }) => prisma.person.upsert({
  where: { userId },
  update: { firstName, lastName, email, phone, isActive: true },
  create: { userId, firstName, lastName, email, phone },
})

async function ensurePeopleForUsers(prisma) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { role: { select: { name: true } }, person: { select: { id: true } } },
    orderBy: { id: 'asc' },
  })

  const roleNames = {
    admin: ['System', 'Administrator'],
    client: ['Client', 'User'],
    professional: ['Professional', 'User'],
    receiving_officer: ['Receiving', 'Officer'],
  }

  for (const user of users) {
    if (user.person) continue
    const [firstName, lastName] = roleNames[user.role?.name] ?? ['Platform', 'User']
    await ensurePerson(prisma, {
      userId: user.id,
      firstName,
      lastName,
      email: user.email,
      phone: null,
    })
  }

  return users.length
}

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
  await ensurePerson(prisma, {
    userId: admin.id,
    firstName: 'System',
    lastName: 'Administrator',
    email: admin.email,
    phone: '+630000000000',
  })
  console.log(`Development admin ensured: ${adminEmail}`)
  return { admin, demoPasswordHash }
}

export { seedDevelopmentUsers, ensureUser, ensurePerson, ensurePeopleForUsers }

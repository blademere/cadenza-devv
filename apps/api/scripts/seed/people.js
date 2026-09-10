const ROLE_PERSON_NAMES = {
  admin: ['System', 'Administrator'],
  client: ['OBO', 'Client'],
  professional: ['OBO', 'Professional'],
  receiving_officer: ['OBO', 'Receiving Officer'],
}

const ensurePersonForUser = async (prisma, user) => {
  const [fallbackFirstName, fallbackLastName] = ROLE_PERSON_NAMES[user.role.name] || [
    user.role.name.replaceAll('_', ' '),
    'User',
  ]

  return prisma.person.upsert({
    where: { userId: user.id },
    update: {
      email: user.email,
      isActive: true,
    },
    create: {
      userId: user.id,
      firstName: fallbackFirstName,
      lastName: fallbackLastName,
      email: user.email,
    },
  })
}

async function seedRolePersons(prisma) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      role: { select: { name: true } },
    },
  })

  for (const user of users) await ensurePersonForUser(prisma, user)

  console.log(`Person profiles ensured for ${users.length} active users.`)
  return users.length
}

export { seedRolePersons }

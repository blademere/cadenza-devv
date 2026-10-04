const applications = {
  'cadenza-client': {
    key: 'cadenza-client',
    name: 'Cadenza Client',
    description: 'Cadenza Client application.',
  },
}

async function seedApplication(prisma, key) {
  const application = applications[key]
  if (!application) throw new Error(`Unknown application '${key}'.`)

  return prisma.app.upsert({
    where: { key: application.key },
    update: {
      name: application.name,
      description: application.description,
      isActive: true,
    },
    create: {
      key: application.key,
      name: application.name,
      description: application.description,
      isActive: true,
    },
  })
}

export { applications, seedApplication }

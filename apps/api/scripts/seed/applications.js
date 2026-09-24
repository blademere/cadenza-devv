const applications = {
  obo: {
    key: 'obo',
    name: 'One-Stop Business Office',
    description: 'One-Stop Business Office application.',
  },
  cadenza: {
    key: 'cadenza',
    name: 'Cadenza Music Center',
    description: 'Music lessons, instrument rentals, and band room rentals.',
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

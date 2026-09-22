const applications = [
  {
    key: 'obo',
    name: 'One-Stop Business Office',
    description: 'One-Stop Business Office application.',
  },
  {
    key: 'cadenza',
    name: 'Cadenza Music Center',
    description: 'Music lessons, instrument rentals, and band room rentals.',
  },
]

async function seedApplications(prisma) {
  const seededApplications = {}

  for (const application of applications) {
    seededApplications[application.key] = await prisma.app.upsert({
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

  return seededApplications
}

export { applications, seedApplications }

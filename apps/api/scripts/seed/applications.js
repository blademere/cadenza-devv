const applications = [
  {
    key: 'obo',
    name: 'One-Stop Business Office',
    description: 'One-Stop Business Office application.',
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

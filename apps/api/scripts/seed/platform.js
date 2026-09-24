import { seedApplications } from './applications.js'

async function seedPlatform(prisma) {
  return seedApplications(prisma)
}

export { seedPlatform }

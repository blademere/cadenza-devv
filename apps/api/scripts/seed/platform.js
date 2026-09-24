import { seedAuthorization } from './authorization.js'

async function seedPlatform(prisma) {
  const { permissionRecords } = await seedAuthorization(prisma, { applicationKeys: [] })

  return { permissionRecords }
}

export { seedPlatform }

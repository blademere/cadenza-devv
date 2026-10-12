import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import env from '../../config/env.js'

const connectionString = env.DATABASE_URL

const adapter = new PrismaPg({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 10000),
})

const prismaClient = new PrismaClient({
  adapter,
  log:
    env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
})

const getPrismaClient = () => prismaClient
const disconnectPrisma = async () => prismaClient.$disconnect()

export { getPrismaClient, disconnectPrisma }

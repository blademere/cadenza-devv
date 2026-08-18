const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma")
}

const adapter = new PrismaPg({ connectionString })

const prismaClient = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["warn", "error"],
})

const getPrismaClient = () => {
  return prismaClient
}

module.exports = {
  getPrismaClient,
}

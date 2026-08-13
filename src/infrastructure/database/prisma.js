const { PrismaClient } = require("@prisma/client")

const prismaClient = new PrismaClient({
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

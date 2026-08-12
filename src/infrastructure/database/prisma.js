const { PrismaClient } = require("@prisma/client");

let prismaClient;

if (!prismaClient) {
  prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

module.exports = {
  getPrismaClient: () => prismaClient,
};

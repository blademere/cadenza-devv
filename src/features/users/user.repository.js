const { getPrismaClient } = require("../../infrastructure/database/prisma");
const prisma = getPrismaClient();

const findAllUsers = async ({ skip, take }) => {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
    prisma.user.count(),
  ]);

  return { users, total };
};

const createUser = async ({ name, email, role, passwordHash }) => {
  return prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
};

module.exports = {
  findAllUsers,
  createUser,
};

import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findPage = ({ where, orderBy, skip, take }, db = prisma) =>
  Promise.all([
    db.auditLog.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            person: { select: { firstName: true, middleName: true, lastName: true, suffix: true } },
          },
        },
      },
    }),
    db.auditLog.count({ where }),
  ])

export { findPage }

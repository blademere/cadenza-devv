import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const findAllUsers = async ({ skip, take, filters = {}, orderBy }) => {
  const where = {}
  if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' }
  if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true'
  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip, take, where, orderBy, select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true, role: { select: { id: true, name: true, description: true } } } }),
    prisma.user.count({ where }),
  ])
  return { users, total }
}

const findUserByEmail = async (email, db = prisma) => db.user.findUnique({ where: { email }, select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true, role: { select: { id: true, name: true, description: true } } } })
const createUser = async ({ email, roleId, passwordHash }, db = prisma) => db.user.create({ data: { email, passwordHash, roleId }, select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true, role: { select: { id: true, name: true, description: true } } } })
const findUserWithRole = async (userId, db = prisma) => db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, isActive: true, roleId: true, role: { select: { id: true, name: true, description: true } } } })
const findRoleForAssignment = async (roleId, db = prisma) => db.role.findUnique({ where: { id: roleId }, select: { id: true, name: true, description: true, permissions: { select: { permission: { select: { action: true, module: { select: { key: true, isActive: true } } } } } } } })
const updateUserRole = async (userId, roleId, db = prisma) => db.user.update({ where: { id: userId }, data: { roleId }, select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true, role: { select: { id: true, name: true, description: true } } } })

export { findAllUsers, findUserByEmail, createUser, findUserWithRole, findRoleForAssignment, updateUserRole }

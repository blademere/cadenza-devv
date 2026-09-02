import { BadRequestError } from '../../common/errors/appError.js'

const parsePermissionKey = (key) => {
  const index = key?.indexOf('.')
  if (!key || index <= 0 || index === key.length - 1)
    throw new BadRequestError(`Invalid permission key '${key}'.`)
  return { resource: key.slice(0, index), action: key.slice(index + 1) }
}

const resolveApproverIds = async (step, db) => {
  if (!step.approverType || !step.approverValue)
    throw new BadRequestError(
      `Approval step '${step.name}' has no approver configuration.`
    )

  if (step.approverType === 'USER') {
    const userId = Number(step.approverValue)
    if (!Number.isInteger(userId))
      throw new BadRequestError(
        `Invalid user approver '${step.approverValue}'.`
      )
    const user = await db.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true },
    })
    return user ? [user.id] : []
  }

  if (step.approverType === 'ROLE') {
    const users = await db.user.findMany({
      where: { isActive: true, role: { name: step.approverValue } },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    return users.map((user) => user.id)
  }

  if (step.approverType === 'PERMISSION') {
    const { resource, action } = parsePermissionKey(step.approverValue)
    const users = await db.user.findMany({
      where: {
        isActive: true,
        role: {
          permissions: {
            some: { permission: { action, module: { key: resource } } },
          },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    return users.map((user) => user.id)
  }

  throw new BadRequestError(`Unsupported approver type '${step.approverType}'.`)
}

export { resolveApproverIds }

import { ForbiddenError } from '../../common/errors/appError.js'

const ownershipPolicy = ({ user, resource, userId, ownerId }) => {
  const resolvedUserId = user?.id ?? userId
  const resolvedOwnerId = resource?.ownerId ?? user?.ownerId ?? ownerId

  return Number(resolvedUserId) === Number(resolvedOwnerId)
}

const evaluatePolicy = async ({ policy, user, resource }) => {
  if (typeof policy !== 'function') {
    throw new TypeError('Authorization policy must be a function.')
  }

  return Boolean(await policy({ user, resource }))
}

const assertPolicy = async ({ policy, user, resource, message }) => {
  const allowed = await evaluatePolicy({ policy, user, resource })

  if (!allowed) {
    throw new ForbiddenError(
      message || 'You are not authorized to access this resource.',
    )
  }
}

export {
  ownershipPolicy,
  evaluatePolicy,
  assertPolicy,
}

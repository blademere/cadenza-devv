import { ForbiddenError } from "../../common/errors/appError.js"

const ownershipPolicy = ({ userId, ownerId }) => {
  return Number(userId) === Number(ownerId)
}

const anyPolicy = () => true

const evaluatePolicy = async ({ policy, user, resource }) => {
  if (typeof policy !== "function") {
    throw new TypeError("Access-control policy must be a function.")
  }

  return Boolean(await policy({ user, resource }))
}

const assertPolicy = async ({ policy, user, resource, message }) => {
  const allowed = await evaluatePolicy({ policy, user, resource })

  if (!allowed) {
    throw new ForbiddenError(
      message || "You are not authorized to access this resource.",
    )
  }
}

export {
  ownershipPolicy,
  anyPolicy,
  evaluatePolicy,
  assertPolicy,
}

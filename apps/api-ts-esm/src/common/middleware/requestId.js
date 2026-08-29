const { randomUUID } = require("node:crypto")

const requestId = (req, res, next) => {
  const incoming = req.get("x-request-id")
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID()

  req.requestId = id
  res.set("X-Request-ID", id)

  return next()
}

module.exports = requestId

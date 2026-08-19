const repository = require('./permit-type.repository')

const listPermitTypes = () => repository.listActive()

module.exports = { listPermitTypes }

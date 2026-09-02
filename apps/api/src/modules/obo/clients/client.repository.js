const { findPersonByUserId } = require('../../../features/people/people.repository')

const findByUserId = (userId) => findPersonByUserId(userId)

module.exports = { findByUserId }

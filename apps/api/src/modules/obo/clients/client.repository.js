import { findPersonByUserId } from '../../../features/people/people.repository.js'

const findByUserId = (userId) => findPersonByUserId(userId)

export { findByUserId }

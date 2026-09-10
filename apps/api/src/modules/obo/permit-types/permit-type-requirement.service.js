import { BadRequestError, ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as requirementService from '../../../features/requirements/requirements.service.js'
import * as repository from './permit-type-requirement.repository.js'
import * as permitTypeRepository from './permit-type.repository.js'

const normalizeIds = (requirementIds = []) => [...new Set(requirementIds.filter(Boolean))]

const listRequirements = async (permitTypeId) => {
  const permitType = await permitTypeRepository.findById(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  return repository.listByPermitTypeId(permitTypeId)
}

const setRequirements = async ({ permitTypeId, requirementIds }) => {
  const ids = normalizeIds(requirementIds)
  if (!Array.isArray(requirementIds)) throw new BadRequestError('requirementIds must be an array.')

  const permitType = await permitTypeRepository.findById(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot configure requirements.')

  const definitions = await Promise.all(ids.map((id) => requirementService.getDefinitionById(id)))
  if (definitions.some((definition) => !definition || !definition.isActive)) {
    throw new NotFoundError('One or more active requirement definitions were not found.')
  }

  return repository.withTransaction(async (tx) => {
    const existing = await repository.listByPermitTypeId(permitTypeId, tx)
    const desired = new Set(ids)
    for (const association of existing) {
      if (!desired.has(association.requirementId)) {
        await repository.deleteByPermitTypeAndRequirement(permitTypeId, association.requirementId, tx)
      }
    }
    const existingIds = new Set(existing.map((association) => association.requirementId))
    for (const requirementId of ids) {
      if (!existingIds.has(requirementId)) await repository.create({ permitTypeId, requirementId }, tx)
    }
    return repository.listByPermitTypeId(permitTypeId, tx)
  })
}

export { listRequirements, setRequirements }

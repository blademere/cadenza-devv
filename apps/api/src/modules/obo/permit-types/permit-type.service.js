import { NotFoundError } from '../../../common/errors/appError.js'
import * as repository from './permit-type.repository.js'

const listPermitTypes = () => repository.listActive()

const getPermitTypeForm = async (id) => {
  const permitType = await repository.findActiveById(id)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) return null
  const publishedVersion = permitType.form.versions[0]
  if (!publishedVersion) return null
  return {
    id: permitType.form.id,
    key: permitType.form.key,
    name: permitType.form.name,
    description: permitType.form.description,
    version: publishedVersion.version,
    sections: publishedVersion.sections,
    fields: publishedVersion.fields,
    documentRequirements: publishedVersion.documentRequirements,
  }
}

export { listPermitTypes, getPermitTypeForm }

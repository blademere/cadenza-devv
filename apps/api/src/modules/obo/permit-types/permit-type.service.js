import { NotFoundError } from '../../../common/errors/appError.js'
import * as repository from './permit-type.repository.js'

const toFormResponse = (permitType, formVersion) => ({
  id: permitType.form.id,
  key: permitType.form.key,
  name: permitType.form.name,
  description: permitType.form.description,
  version: formVersion.version,
  formVersionId: formVersion.id,
  sections: formVersion.sections,
  fields: formVersion.fields,
  documentRequirements: formVersion.documentRequirements,
})

const listPermitTypes = () => repository.listActive()

const getPermitTypeForm = async (id, version) => {
  const permitType = await repository.findActiveById(id)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) return null

  const publishedVersion = version == null
    ? permitType.form.versions[0]
    : await repository.findPublishedFormVersion(permitType.form.id, version)

  if (!publishedVersion) return null
  return toFormResponse(permitType, publishedVersion)
}

export { listPermitTypes, getPermitTypeForm }

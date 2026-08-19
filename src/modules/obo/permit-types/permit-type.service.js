const { NotFoundError } = require('../../../common/errors/appError')
const repository = require('./permit-type.repository')

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

module.exports = { listPermitTypes, getPermitTypeForm }

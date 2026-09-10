import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as professionalService from './professional.service.js'

const getProfessional = professionalService.getForReference

const getSelectedProfessionalIds = (formVersion, formValues) => {
  const fields = formVersion?.sections?.flatMap((section) => section.fields || []) || []
  const professionalFields = fields.filter((field) => field.type === 'professional_reference')
  return professionalFields.flatMap((field) => {
    const value = formValues?.[field.key]
    if (Array.isArray(value)) return value
    return value ? [value] : []
  })
}

const validateProfessionalReferences = async ({ formVersion, formValues }) => {
  const selectedIds = getSelectedProfessionalIds(formVersion, formValues)
  const uniqueIds = [...new Set(selectedIds)]
  for (const id of uniqueIds) {
    const professional = await getProfessional(id)
    if (!professional) throw new NotFoundError('Selected professional not found.')
    if (professional.status !== 'VERIFIED') {
      throw new ConflictError('Selected professional is not verified.')
    }
  }
  return true
}

const buildProfessionalSnapshots = async ({ formVersion, formValues }) => {
  const fields = formVersion?.sections?.flatMap((section) => section.fields || []) || []
  const professionalFields = fields.filter((field) => field.type === 'professional_reference')
  const snapshots = {}

  for (const field of professionalFields) {
    const value = formValues?.[field.key]
    const selectedIds = Array.isArray(value) ? value : value ? [value] : []
    if (!selectedIds.length) continue

    const selectedProfessionals = await Promise.all(selectedIds.map((id) => getProfessional(id)))
    snapshots[field.key] = selectedProfessionals.filter(Boolean).map((professional) => ({
      professionalId: professional.id,
      registrationNumber: professional.registrationNumber,
      prcId: professional.prcId,
      ptrNumber: professional.ptrNumber,
      professionalRole: professional.professionalRole,
      person: professional.person
        ? {
            id: professional.person.id,
            firstName: professional.person.firstName,
            middleName: professional.person.middleName,
            lastName: professional.person.lastName,
            suffix: professional.person.suffix,
          }
        : null,
    }))
  }

  return snapshots
}

export { getSelectedProfessionalIds, validateProfessionalReferences, buildProfessionalSnapshots }

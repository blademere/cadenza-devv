import { z } from 'zod'
import { ValidationError } from '../../../common/errors/appError.js'
import * as formService from '../../../platform/forms/form.service.js'
import * as professionalRepository from '../professionals/professional.repository.js'

const professionalId = z.string().uuid()

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

const normalizeReferenceValues = (field, value) => {
  if (field.config?.multiple === true) return Array.isArray(value) ? value : []
  return isEmpty(value) ? [] : [value]
}

const getProfessionalReferenceFields = (formVersion) =>
  formVersion.fields.filter((field) => {
    if (field.type !== 'reference') return false
    return field.config?.referenceType === 'obo_professional'
  })

const validateProfessionalReferences = async ({ formVersion, formValues, repository = professionalRepository }) => {
  const errors = []

  for (const field of getProfessionalReferenceFields(formVersion)) {
    if (!formService.evaluateCondition(field.visibility, formValues)) continue

    const value = formValues[field.key]
    if (isEmpty(value)) {
      if (field.required) {
        errors.push({ field: field.key, code: 'REQUIRED', message: `${field.label} is required.` })
      }
      continue
    }

    const references = normalizeReferenceValues(field, value)
    if (field.config?.multiple === true && !Array.isArray(value)) {
      errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must contain multiple professional references.` })
      continue
    }

    for (const reference of references) {
      const parsedId = professionalId.safeParse(reference)
      if (!parsedId.success) {
        errors.push({
          field: field.key,
          code: 'REFERENCE',
          reference,
          message: `${field.label} contains an invalid professional reference.`
        })
        continue
      }

      const professional = await repository.findById(parsedId.data)
      if (!professional) {
        errors.push({
          field: field.key,
          code: 'NOT_FOUND',
          reference: parsedId.data,
          message: `${field.label} references a professional that does not exist.`
        })
        continue
      }

      if (professional.status !== 'VERIFIED') {
        errors.push({
          field: field.key,
          code: 'NOT_VERIFIED',
          reference: professional.id,
          message: `${field.label} may only reference a verified professional.`
        })
      }

      if (!professional.person?.isActive) {
        errors.push({
          field: field.key,
          code: 'INACTIVE',
          reference: professional.id,
          message: `${field.label} may only reference an active professional.`
        })
      }

      if (professional.professionalRole !== field.config.professionalRole) {
        errors.push({
          field: field.key,
          code: 'ROLE',
          reference: professional.id,
          expectedRole: field.config.professionalRole,
          actualRole: professional.professionalRole || null,
          message: `${field.label} references a professional with an incompatible professional role.`
        })
      }
    }
  }

  if (errors.length) {
    throw new ValidationError('Professional reference validation failed.', errors)
  }

  return true
}

export {
  getProfessionalReferenceFields,
  validateProfessionalReferences,
}

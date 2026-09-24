import { z } from 'zod'
import { ValidationError } from '../../../common/errors/appError.js'
import * as formService from '../../../platform/forms/form.service.js'
import * as professionalService from './professional.service.js'

const professionalId = z.string().uuid()

const isEmpty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)

const normalizeReferenceValues = (field, value) => field.config?.multiple === true ? (Array.isArray(value) ? value : []) : (isEmpty(value) ? [] : [value])

const getProfessionalReferenceFields = (formVersion) => formVersion.fields.filter((field) => field.type === 'reference' && field.config?.referenceType === 'obo_professional')

const validateProfessionalReferences = async ({ formVersion, formValues, appId, getProfessional = professionalService.getForReference }) => {
  const errors = []
  for (const field of getProfessionalReferenceFields(formVersion)) {
    if (!formService.evaluateCondition(field.visibility, formValues)) continue
    const value = formValues[field.key]
    if (isEmpty(value)) {
      if (field.required) errors.push({ field: field.key, code: 'REQUIRED', message: `${field.label} is required.` })
      continue
    }
    const multiple = field.config?.multiple === true
    if (multiple && !Array.isArray(value)) {
      errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must contain multiple professional references.` })
      continue
    }
    if (!multiple && Array.isArray(value)) {
      errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must contain a single professional reference.` })
      continue
    }
    const references = normalizeReferenceValues(field, value)
    const seenReferences = new Set()
    for (const reference of references) {
      const parsedId = professionalId.safeParse(reference)
      if (!parsedId.success) {
        errors.push({ field: field.key, code: 'REFERENCE', reference, message: `${field.label} contains an invalid professional reference.` })
        continue
      }
      if (seenReferences.has(parsedId.data)) {
        errors.push({ field: field.key, code: 'DUPLICATE', reference: parsedId.data, message: `${field.label} contains a duplicate professional reference.` })
        continue
      }
      seenReferences.add(parsedId.data)
      const professional = await getProfessional(parsedId.data, appId)
      if (!professional) {
        errors.push({ field: field.key, code: 'NOT_FOUND', reference: parsedId.data, message: `${field.label} references a professional that does not exist in this application.` })
        continue
      }
      if (professional.status !== 'VERIFIED') errors.push({ field: field.key, code: 'NOT_VERIFIED', reference: professional.id, message: `${field.label} may only reference a verified professional.` })
      if (!professional.person?.isActive) errors.push({ field: field.key, code: 'INACTIVE', reference: professional.id, message: `${field.label} may only reference an active professional.` })
      if (professional.professionalRole !== field.config.professionalRole) errors.push({ field: field.key, code: 'ROLE', reference: professional.id, expectedRole: field.config.professionalRole, actualRole: professional.professionalRole || null, message: `${field.label} references a professional with an incompatible professional role.` })
    }
  }
  if (errors.length) throw new ValidationError('Professional reference validation failed.', errors)
  return true
}

const professionalSnapshot = (professional) => ({ professionalId: professional.id, name: [professional.person?.firstName, professional.person?.middleName, professional.person?.lastName, professional.person?.suffix].filter(Boolean).join(' ') || 'Professional', registrationNumber: professional.registrationNumber ?? null, prcId: professional.prcId ?? null, ptrNumber: professional.ptrNumber ?? null, role: professional.professionalRole ?? null })

const buildProfessionalSnapshots = async ({ formVersion, formValues, appId, getProfessional = professionalService.getForReference }) => {
  const snapshots = {}
  for (const field of getProfessionalReferenceFields(formVersion)) {
    if (!formService.evaluateCondition(field.visibility, formValues)) continue
    const value = formValues[field.key]
    if (isEmpty(value)) continue
    const references = normalizeReferenceValues(field, value)
    const resolved = []
    for (const reference of references) {
      const parsedId = professionalId.safeParse(reference)
      if (!parsedId.success) continue
      const professional = await getProfessional(parsedId.data, appId)
      if (!professional) continue
      resolved.push(professionalSnapshot(professional))
    }
    if (resolved.length === 0) continue
    snapshots[field.key] = field.config?.multiple === true ? resolved : resolved[0]
  }
  return snapshots
}

export { getProfessionalReferenceFields, validateProfessionalReferences, buildProfessionalSnapshots }

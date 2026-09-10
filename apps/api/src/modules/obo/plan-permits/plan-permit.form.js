import { ConflictError, ValidationError } from '../../../common/errors/appError.js'
import * as formService from '../../../platform/forms/form.service.js'

const resolveAndValidateForm = async ({ permitType, formVersionId, formValues }) => {
  if (!permitType.formId) {
    return { formVersionId: formVersionId || null }
  }

  const form = await formService.getPublishedForm(permitType.formId)
  if (!form || !form.isActive) {
    throw new ConflictError('The permit type is linked to an inactive form.')
  }

  if (formVersionId) {
    const version = await formService.getFormVersion({ formKey: form.key, version: formVersionId })
    if (!version || version.formId !== form.id || version.status !== 'PUBLISHED') {
      throw new ConflictError('The selected form version is not a published version for this permit type.')
    }

    const validation = await formService.validateFormValues({
      formKey: form.key,
      version: version.version,
      values: formValues,
      requireRequired: false,
    })

    if (!validation.valid) {
      throw new ValidationError('Permit form validation failed.', validation.errors)
    }

    return { formVersionId: version.id }
  }

  const validation = await formService.validateFormValues({
    formKey: form.key,
    values: formValues,
    requireRequired: false,
  })

  if (!validation.valid) {
    throw new ValidationError('Permit form validation failed.', validation.errors)
  }

  return { formVersionId: validation.formVersionId }
}

export { resolveAndValidateForm }

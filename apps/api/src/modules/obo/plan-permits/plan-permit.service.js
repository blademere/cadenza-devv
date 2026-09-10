import { isDeepStrictEqual } from 'node:util'
import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/appError.js'
import { recordAudit } from '../../../platform/audit/audit.service.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as formService from '../../../platform/forms/form.service.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'
import * as repository from './plan-permit.repository.js'
import { resolveAndValidateForm } from './plan-permit.form.js'
import { buildProfessionalSnapshots, validateProfessionalReferences } from '../professionals/professional-reference.service.js'
import * as permitTypeService from '../permit-types/permit-type.service.js'
import * as caseService from '../../../features/cases/cases.service.js'
import { getWorkflowState, withWorkflowState } from './plan-permit.workflow.js'
import { getNotificationContext } from '../notification-context.js'

const WORKFLOW_KEY = 'obo_plan_permit'
const SUBJECT_TYPE = 'OboPermitApplication'
const STATUS = Object.freeze({ DRAFT: 'DRAFT', READY_FOR_SUBMISSION: 'READY_FOR_SUBMISSION', SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION' })

const getClientPerson = async (userId) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  return person
}

const hydrateApplication = async (application, db) => {
  if (!application) return application
  let hydrated = application
  if (application.formVersionId) {
    const formVersion = await formService.getFormVersionById(application.formVersionId, db)
    hydrated = { ...hydrated, formVersion }
  }
  if (application.submissionAppointment?.appointmentId) {
    const appointment = await appointmentService.getAppointmentForReference({ id: application.submissionAppointment.appointmentId, db })
    hydrated = { ...hydrated, submissionAppointment: { ...application.submissionAppointment, appointment } }
  }
  return hydrated
}

const resolveReplacement = async ({ replacesApplicationId, personId }) => {
  if (!replacesApplicationId) return null
  const original = await repository.findOwnedByClient(replacesApplicationId, personId)
  if (!original) throw new NotFoundError('The application being replaced was not found.')
  const originalWithStatus = await withWorkflowState(original)
  if (originalWithStatus.status !== STATUS.DECLINED) throw new ConflictError('Only a declined permit application can be replaced with a new application.')
  return originalWithStatus
}

const createCaseRecord = async ({ userId, permitTypeName, db }) => {
  const caseType = await caseService.getOrCreateType({ key: 'obo-permit-application', name: 'OBO Permit Application', description: 'OBO permit application lifecycle', db })
  return caseService.createRecord({ caseTypeId: caseType.id, title: `${permitTypeName} Application`, status: 'OPEN', createdByUserId: userId }, { db })
}

const createApplication = async ({ userId, permitTypeId, formVersionId, formValues, replacesApplicationId }) => {
  const person = await getClientPerson(userId)
  const permitType = await permitTypeService.getPermitTypeById(permitTypeId)
  if (!permitType) throw new NotFoundError('Active permit type not found.')
  const replacement = await resolveReplacement({ replacesApplicationId, personId: person.id })
  const resolvedForm = await resolveAndValidateForm({ permitType, formVersionId, formValues })
  const application = await repository.withTransaction(async (tx) => {
    const referenceNumber = `OBO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
    const caseRecord = await createCaseRecord({ userId, permitTypeName: permitType.name, db: tx })
    const created = await repository.create({ clientPersonId: person.id, permitTypeId, formVersionId: resolvedForm.formVersionId, formValues, replacesApplicationId: replacement?.id || null, caseId: caseRecord.id, referenceNumber }, tx)
    const notificationContext = await getNotificationContext({ personId: person.id, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    const workflow = await workflowService.startWorkflow({ workflowKey: WORKFLOW_KEY, subjectType: SUBJECT_TYPE, subjectId: created.id, actorId: userId, metadata: { source: replacement ? 'obo-plan-permit.replace-declined' : 'obo-plan-permit.create', referenceNumber: created.referenceNumber, permitTypeName: permitType.name, replacesReferenceNumber: replacement?.referenceNumber || null, ...notificationContext }, db: tx })
    return repository.update(created.id, { workflowInstanceId: workflow.id }, tx)
  })
  return withWorkflowState(await hydrateApplication(application))
}

const getMine = async ({ id, userId }) => {
  const person = await getClientPerson(userId)
  const application = await repository.findOwnedByClient(id, person.id)
  if (!application) throw new NotFoundError('Permit application not found.')
  return withWorkflowState(await hydrateApplication(application))
}

const getForReceiving = async (id) => {
  const application = await repository.findById(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  return withWorkflowState(await hydrateApplication(application))
}

const getForApplicationDocuments = async (id) => {
  const application = await repository.findById(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  return hydrateApplication(application)
}

const listMine = async ({ userId }) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) return []
  const applications = await repository.listByClient(person.id)
  return Promise.all(applications.map(async (application) => withWorkflowState(await hydrateApplication(application))))
}

const getChangedFormFields = (before = {}, after = {}) => {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  return [...keys].filter((key) => !isDeepStrictEqual(before?.[key], after?.[key]))
}

const updateDraft = async ({ id, userId, formVersionId, formValues }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) throw new ConflictError('Only draft applications can be updated.')
  const resolvedForm = await resolveAndValidateForm({ permitType: application.permitType, formVersionId: formVersionId || application.formVersionId, formValues })
  const updated = await repository.withTransaction(async (tx) => {
    const result = await repository.update(id, { formVersionId: resolvedForm.formVersionId, formValues }, tx)
    if (application.formVersionId !== resolvedForm.formVersionId) await recordAudit({ actorId: userId, action: 'OBO_PERMIT_APPLICATION_FORM_VERSION_CHANGED', entityType: SUBJECT_TYPE, entityId: id, before: application.formVersionId || null, after: resolvedForm.formVersionId || null, metadata: { referenceNumber: application.referenceNumber || null }, db: tx })
    for (const fieldKey of getChangedFormFields(application.formValues, formValues)) await recordAudit({ actorId: userId, action: 'OBO_PERMIT_APPLICATION_FORM_FIELD_UPDATED', entityType: SUBJECT_TYPE, entityId: id, before: application.formValues?.[fieldKey] ?? null, after: formValues?.[fieldKey] ?? null, metadata: { formVersionId: resolvedForm.formVersionId, fieldKey, referenceNumber: application.referenceNumber || null }, db: tx })
    return result
  })
  return withWorkflowState(await hydrateApplication(updated))
}

const validateSubmissionProfessionals = async (application) => {
  if (!application.formVersion || !application.permitType.formId) return null
  const form = await formService.getFormById(application.permitType.formId)
  if (!form || !form.isActive) throw new ConflictError('The permit type is linked to an inactive form.')
  const formVersion = application.formVersion
  const validation = await formService.validateFormValues({ formKey: form.key, version: formVersion.version, values: application.formValues, requireRequired: true })
  if (!validation.valid) throw new ValidationError('Permit form validation failed.', validation.errors)
  await validateProfessionalReferences({ formVersion, formValues: application.formValues })
  return buildProfessionalSnapshots({ formVersion, formValues: application.formValues })
}

const submit = async ({ id, userId }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) throw new ConflictError('Only draft applications can be submitted.')
  const professionalSnapshots = await validateSubmissionProfessionals(application)
  const updated = await repository.withTransaction(async (tx) => {
    if (professionalSnapshots && Object.keys(professionalSnapshots).length > 0) await repository.update(id, { professionalSnapshots }, tx)
    const notificationContext = await getNotificationContext({ personId: application.clientPersonId, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey: 'SUBMIT_FOR_SUBMISSION', actorId: userId, metadata: { source: 'obo-plan-permit.submit', referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext }, db: tx })
    await recordAudit({ actorId: userId, action: 'OBO_PERMIT_APPLICATION_SUBMITTED', entityType: SUBJECT_TYPE, entityId: id, before: { formVersionId: application.formVersionId || null, formValues: application.formValues || {} }, after: { formVersionId: application.formVersionId || null, formValues: application.formValues || {}, professionalSnapshots: professionalSnapshots || application.professionalSnapshots || null }, metadata: { formVersionId: application.formVersionId || null, referenceNumber: application.referenceNumber || null, professionalFieldKeys: Object.keys(professionalSnapshots || {}) }, db: tx })
    return repository.findById(id, tx)
  })
  return withWorkflowState(await hydrateApplication(updated))
}

export { STATUS, WORKFLOW_KEY, SUBJECT_TYPE, createApplication, getMine, getForReceiving, getForApplicationDocuments, listMine, updateDraft, submit, getWorkflowState, withWorkflowState }

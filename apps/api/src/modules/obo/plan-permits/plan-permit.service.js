import crypto from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/appError.js'
import { recordAudit } from '../../../platform/audit/audit.service.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as formService from '../../../platform/forms/form.service.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'
import * as requirementService from '../../../features/requirements/requirements.service.js'
import * as taskService from '../../../features/tasks/tasks.service.js'
import participantService from '../../../features/participants/participants.service.js'
import * as repository from './plan-permit.repository.js'
import { resolveAndValidateForm } from './plan-permit.form.js'
import { buildProfessionalSnapshots, validateProfessionalReferences } from '../professionals/professional-reference.service.js'
import * as professionalService from '../professionals/professional.service.js'
import * as permitTypeService from '../permit-types/permit-type.service.js'
import * as permitTypeRequirementService from '../permit-types/permit-type-requirement.service.js'
import * as caseService from '../../../features/cases/cases.service.js'
import { getWorkflowState, withWorkflowState } from './plan-permit.workflow.js'
import { getNotificationContext } from '../notification-context.js'

const WORKFLOW_KEY = 'obo_plan_permit'
const SUBJECT_TYPE = 'OboPermitApplication'
const STATUS = Object.freeze({ DRAFT: 'DRAFT', READY_FOR_SUBMISSION: 'READY_FOR_SUBMISSION', SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION' })
const PARTICIPANT_ROLE = Object.freeze({ APPLICANT: 'APPLICANT', PROFESSIONAL: 'PROFESSIONAL' })
const TASK_TYPE = Object.freeze({ REVIEW_APPLICATION: 'REVIEW_APPLICATION' })

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
    hydrated = { ...hydrated, submissionAppointment: { ...hydrated.submissionAppointment, appointment } }
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

const addApplicantParticipant = async ({ caseId, personId, db }) =>
  participantService.add({ caseId, personId, roleKey: PARTICIPANT_ROLE.APPLICANT, isPrimary: true, metadata: { source: 'obo-plan-permit' }, db })

const getProfessionalSnapshotEntries = (snapshots = {}) => {
  const entries = []
  for (const [fieldKey, value] of Object.entries(snapshots)) {
    const values = Array.isArray(value) ? value : [value]
    for (const snapshot of values) {
      if (snapshot?.professionalId) entries.push({ fieldKey, snapshot })
    }
  }
  return entries
}

const addProfessionalParticipants = async ({ caseId, applicationId, professionalSnapshots, db, actorId }) => {
  const addedPersonIds = new Set()
  const associatedProfessionals = []
  for (const { fieldKey, snapshot } of getProfessionalSnapshotEntries(professionalSnapshots)) {
    const professional = await professionalService.getForReference(snapshot.professionalId)
    if (!professional?.personId) throw new ConflictError('Referenced professional is missing a person profile.')
    if (addedPersonIds.has(professional.personId)) continue
    await participantService.add({
      caseId,
      personId: professional.personId,
      roleKey: PARTICIPANT_ROLE.PROFESSIONAL,
      isPrimary: false,
      metadata: {
        source: 'obo-plan-permit',
        professionalId: professional.id,
        professionalRole: professional.professionalRole || null,
        fieldKey,
      },
      db,
    })
    await publish({
      db,
      event: 'obo.permit_application.professional.associated',
      entityType: SUBJECT_TYPE,
      entityId: applicationId,
      actorId,
      context: {
        caseId,
        professionalId: professional.id,
        professionalPersonId: professional.personId,
        professionalRole: professional.professionalRole || null,
        fieldKey,
      },
      idempotencyKey: `obo:permit-application:${applicationId}:professional:${professional.id}`,
    })
    associatedProfessionals.push(professional.id)
    addedPersonIds.add(professional.personId)
  }
  return associatedProfessionals
}

const attachPermitRequirements = async ({ caseId, permitTypeId, db }) => {
  const requirementIds = await permitTypeRequirementService.getRequirementIds(permitTypeId, db)
  return requirementService.attachDefinitionsToCase({
    caseId,
    requirementIds,
    metadata: { source: 'obo-plan-permit', permitTypeId },
    db,
  })
}

const createApplication = async ({ userId, permitTypeId, formVersionId, formValues, replacesApplicationId }) => {
  const person = await getClientPerson(userId)
  const permitType = await permitTypeService.getPermitTypeById(permitTypeId)
  if (!permitType) throw new NotFoundError('Active permit type not found.')
  const replacement = await resolveReplacement({ replacesApplicationId, personId: person.id })
  const resolvedForm = await resolveAndValidateForm({ permitType, formVersionId, formValues })
  const application = await repository.withTransaction(async (tx) => {
    const referenceNumber = `OBO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const caseRecord = await createCaseRecord({ userId, permitTypeName: permitType.name, db: tx })
    await attachPermitRequirements({ caseId: caseRecord.id, permitTypeId, db: tx })
    const created = await repository.create({ clientPersonId: person.id, permitTypeId, formVersionId: resolvedForm.formVersionId, formValues, replacesApplicationId: replacement?.id || null, caseId: caseRecord.id, referenceNumber }, tx)
    await addApplicantParticipant({ caseId: caseRecord.id, personId: person.id, db: tx })
    const notificationContext = await getNotificationContext({ personId: person.id, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    const workflow = await workflowService.startWorkflow({ workflowKey: WORKFLOW_KEY, subjectType: SUBJECT_TYPE, subjectId: created.id, actorId: userId, metadata: { source: replacement ? 'obo-plan-permit.replace-declined' : 'obo-plan-permit.create', referenceNumber: created.referenceNumber, permitTypeName: permitType.name, replacesReferenceNumber: replacement?.referenceNumber || null, ...notificationContext }, db: tx })
    const updated = await repository.update(created.id, { workflowInstanceId: workflow.id }, tx)
    await publish({
      db: tx,
      event: 'obo.permit_application.created',
      entityType: SUBJECT_TYPE,
      entityId: updated.id,
      actorId: userId,
      context: {
        caseId: updated.caseId,
        referenceNumber: updated.referenceNumber,
        permitTypeId: updated.permitTypeId,
        permitTypeName: permitType.name,
        workflowInstanceId: workflow.id,
        replacesApplicationId: replacement?.id || null,
        replacesReferenceNumber: replacement?.referenceNumber || null,
      },
      idempotencyKey: `obo:permit-application:${updated.id}:created`,
    })
    if (replacement) {
      await publish({
        db: tx,
        event: 'obo.permit_application.replacement_created',
        entityType: SUBJECT_TYPE,
        entityId: updated.id,
        actorId: userId,
        context: {
          caseId: updated.caseId,
          referenceNumber: updated.referenceNumber,
          originalApplicationId: replacement.id,
          originalReferenceNumber: replacement.referenceNumber,
        },
        idempotencyKey: `obo:permit-application:${updated.id}:replacement:${replacement.id}`,
      })
    }
    return updated
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
    let associatedProfessionals = []
    if (professionalSnapshots && Object.keys(professionalSnapshots).length > 0) {
      await repository.update(id, { professionalSnapshots }, tx)
      associatedProfessionals = await addProfessionalParticipants({ caseId: application.caseId, applicationId: id, professionalSnapshots, db: tx, actorId: userId })
    }
    const notificationContext = await getNotificationContext({ personId: application.clientPersonId, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey: 'SUBMIT_FOR_SUBMISSION', actorId: userId, metadata: { source: 'obo-plan-permit.submit', referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext }, db: tx })
    await taskService.create({
      caseId: application.caseId,
      title: 'Review permit application',
      description: `Review ${application.referenceNumber} before hard-copy submission is scheduled.`,
      status: 'OPEN',
      priority: 'HIGH',
      metadata: { source: 'obo-plan-permit', taskType: TASK_TYPE.REVIEW_APPLICATION, applicationId: id, workflowTransition: 'SUBMIT_FOR_SUBMISSION' },
    }, { db: tx })
    await recordAudit({ actorId: userId, action: 'OBO_PERMIT_APPLICATION_SUBMITTED', entityType: SUBJECT_TYPE, entityId: id, before: { formVersionId: application.formVersionId || null, formValues: application.formValues || {} }, after: { formVersionId: application.formVersionId || null, formValues: application.formValues || {}, professionalSnapshots: professionalSnapshots || application.professionalSnapshots || null }, metadata: { formVersionId: application.formVersionId || null, referenceNumber: application.referenceNumber || null, professionalFieldKeys: Object.keys(professionalSnapshots || {}) }, db: tx })
    await publish({
      db: tx,
      event: 'obo.permit_application.submitted',
      entityType: SUBJECT_TYPE,
      entityId: id,
      actorId: userId,
      context: {
        caseId: application.caseId,
        referenceNumber: application.referenceNumber,
        permitTypeId: application.permitTypeId,
        permitTypeName: application.permitType.name,
        formVersionId: application.formVersionId || null,
        professionalIds: associatedProfessionals,
        workflowTransition: 'SUBMIT_FOR_SUBMISSION',
      },
      idempotencyKey: `obo:permit-application:${id}:submitted`,
    })
    return repository.findById(id, tx)
  })
  return withWorkflowState(await hydrateApplication(updated))
}

export { STATUS, WORKFLOW_KEY, SUBJECT_TYPE, PARTICIPANT_ROLE, createApplication, getMine, getForReceiving, getForApplicationDocuments, listMine, updateDraft, submit, getWorkflowState, withWorkflowState }
import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as repository from './plan-permit.repository.js'
import { resolveAndValidateForm } from './plan-permit.form.js'
import { getWorkflowState, withWorkflowState } from './plan-permit.workflow.js'

const WORKFLOW_KEY = 'obo_plan_permit'
const SUBJECT_TYPE = 'OboPermitApplication'
const STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  READY_FOR_SUBMISSION: 'READY_FOR_SUBMISSION',
  SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED',
  RECEIVING: 'RECEIVING',
  DECLINED: 'DECLINED',
  FOR_INSPECTION: 'FOR_INSPECTION',
})

const getClientPerson = async (userId) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) {
    throw new ConflictError('The authenticated user does not have a person profile.')
  }
  return person
}

const getClientNotificationContext = async (personId, db) => {
  const person = await repository.findPersonNotificationContext(personId, db)
  return {
    clientUserId: person?.userId || null,
    clientEmail: person?.user?.email || person?.email || null,
  }
}

const resolveReplacement = async ({ replacesApplicationId, personId }) => {
  if (!replacesApplicationId) {
    return null
  }

  const original = await repository.findOwnedByClient(replacesApplicationId, personId)
  if (!original) {
    throw new NotFoundError('The application being replaced was not found.')
  }

  const originalWithStatus = await withWorkflowState(original)
  if (originalWithStatus.status !== STATUS.DECLINED) {
    throw new ConflictError('Only a declined permit application can be replaced with a new application.')
  }

  return originalWithStatus
}

const createApplication = async ({ userId, permitTypeId, professionalId, formVersionId, formValues, replacesApplicationId }) => {
  const person = await getClientPerson(userId)
  const permitType = await repository.findPermitType(permitTypeId)
  if (!permitType) {
    throw new NotFoundError('Active permit type not found.')
  }

  const professional = await repository.findProfessional(professionalId)
  if (!professional) {
    throw new NotFoundError('Professional registration not found.')
  }
  if (professional.status !== 'VERIFIED') {
    throw new ConflictError('The selected professional is not verified.')
  }

  const replacement = await resolveReplacement({
    replacesApplicationId,
    personId: person.id,
  })
  const resolvedForm = await resolveAndValidateForm({
    permitType,
    formVersionId,
    formValues,
  })

  const application = await repository.withTransaction(async (tx) => {
    const created = await repository.create({
      clientPersonId: person.id,
      permitTypeId,
      professionalId,
      formVersionId: resolvedForm.formVersionId,
      formValues,
      userId,
      replacesApplicationId: replacement?.id || null,
    }, tx)

    if (!created) {
      throw new NotFoundError('Active permit type not found.')
    }
    if (created.notFound === 'professional') {
      throw new NotFoundError('Professional registration not found.')
    }

    const notificationContext = await getClientNotificationContext(person.id, tx)
    const workflow = await workflowService.startWorkflow({
      workflowKey: WORKFLOW_KEY,
      subjectType: SUBJECT_TYPE,
      subjectId: created.id,
      actorId: userId,
      metadata: {
        source: replacement ? 'obo-plan-permit.replace-declined' : 'obo-plan-permit.create',
        referenceNumber: created.referenceNumber,
        permitTypeName: permitType.name,
        replacesReferenceNumber: replacement?.referenceNumber || null,
        ...notificationContext,
      },
      db: tx,
    })

    return repository.update(created.id, { workflowInstanceId: workflow.id }, tx)
  })

  return withWorkflowState(application)
}

const getMine = async ({ id, userId }) => {
  const person = await getClientPerson(userId)
  const application = await repository.findOwnedByClient(id, person.id)
  if (!application) {
    throw new NotFoundError('Permit application not found.')
  }
  return withWorkflowState(application)
}

const listMine = async ({ userId }) => {
  const applications = await repository.listByClient((await getClientPerson(userId)).id)
  return Promise.all(applications.map(withWorkflowState))
}

const updateDraft = async ({ id, userId, professionalId, formVersionId, formValues }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) {
    throw new ConflictError('Only draft applications can be updated.')
  }

  const selectedProfessionalId = professionalId || application.professionalId
  const professional = await repository.findProfessional(selectedProfessionalId)
  if (!professional) {
    throw new NotFoundError('Professional registration not found.')
  }
  if (professional.status !== 'VERIFIED') {
    throw new ConflictError('The selected professional is not verified.')
  }

  const resolvedForm = await resolveAndValidateForm({
    permitType: application.permitType,
    formVersionId: formVersionId || application.formVersionId,
    formValues,
  })

  return withWorkflowState(await repository.update(id, {
    professionalId: selectedProfessionalId,
    formVersionId: resolvedForm.formVersionId,
    formValues,
  }))
}

const submit = async ({ id, userId }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) {
    throw new ConflictError('Only draft applications can be submitted.')
  }

  const notificationContext = await getClientNotificationContext(application.clientPersonId)
  await workflowService.transitionWorkflow({
    instanceId: application.workflowInstanceId,
    transitionKey: 'SUBMIT_FOR_SUBMISSION',
    actorId: userId,
    metadata: {
      source: 'obo-plan-permit.submit',
      referenceNumber: application.referenceNumber,
      permitTypeName: application.permitType.name,
      ...notificationContext,
    },
  })

  return withWorkflowState(await repository.findById(id))
}

export {
  STATUS,
  WORKFLOW_KEY,
  SUBJECT_TYPE,
  createApplication,
  getMine,
  listMine,
  updateDraft,
  submit,
  getWorkflowState,
  withWorkflowState,
}

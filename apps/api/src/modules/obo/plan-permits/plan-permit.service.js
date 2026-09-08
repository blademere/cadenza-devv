import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as repository from './plan-permit.repository.js'
import { resolveAndValidateForm } from './plan-permit.form.js'
import { getWorkflowState, withWorkflowState } from './plan-permit.workflow.js'
import { getNotificationContext } from '../notification-context.js'

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

const createApplication = async ({ userId, permitTypeId, formVersionId, formValues, replacesApplicationId }) => {
  const person = await getClientPerson(userId)
  const permitType = await repository.findPermitType(permitTypeId)
  if (!permitType) {
    throw new NotFoundError('Active permit type not found.')
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
      formVersionId: resolvedForm.formVersionId,
      formValues,
      userId,
      replacesApplicationId: replacement?.id || null,
    }, tx)

    if (!created) {
      throw new NotFoundError('Active permit type not found.')
    }

    const notificationContext = await getNotificationContext({
      personId: person.id,
      db: tx,
      findPersonNotificationContext: repository.findPersonNotificationContext,
    })
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
  const person = await repository.findPersonByUserId(userId)
  if (!person) {
    return []
  }

  const applications = await repository.listByClient(person.id)
  return Promise.all(applications.map(withWorkflowState))
}

const updateDraft = async ({ id, userId, formVersionId, formValues }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) {
    throw new ConflictError('Only draft applications can be updated.')
  }

  const resolvedForm = await resolveAndValidateForm({
    permitType: application.permitType,
    formVersionId: formVersionId || application.formVersionId,
    formValues,
  })

  return withWorkflowState(await repository.update(id, {
    formVersionId: resolvedForm.formVersionId,
    formValues,
  }))
}

const submit = async ({ id, userId }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) {
    throw new ConflictError('Only draft applications can be submitted.')
  }

  const notificationContext = await getNotificationContext({
    personId: application.clientPersonId,
    findPersonNotificationContext: repository.findPersonNotificationContext,
  })
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

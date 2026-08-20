const { ConflictError, NotFoundError } = require('../../../common/errors/appError')
const formService = require('../../../platform/forms/form.service')
const workflowService = require('../../../platform/workflow/workflow.service')
const repository = require('./plan-permit.repository')

const WORKFLOW_KEY = 'obo_plan_permit'
const SUBJECT_TYPE = 'OboPermitApplication'
const STATUS = Object.freeze({
  DRAFT: 'DRAFT', READY_FOR_SUBMISSION: 'READY_FOR_SUBMISSION', SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION',
})

const getClientPerson = async (userId) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  return person
}

const getClientNotificationContext = async (personId, db) => {
  const person = await repository.findPersonNotificationContext(personId, db)
  return { clientUserId: person?.userId || null, clientEmail: person?.user?.email || person?.email || null }
}

const getWorkflowState = async (application) => {
  if (!application.workflowInstanceId) throw new ConflictError('Permit application is not attached to a workflow instance.')
  const workflow = await repository.findWorkflowInstance(application.workflowInstanceId)
  if (!workflow) throw new ConflictError('Permit application workflow instance was not found.')
  return workflow
}

const withWorkflowState = async (application) => {
  const workflow = await getWorkflowState(application)
  return { ...application, status: workflow.currentStep.key, workflowInstanceId: workflow.id }
}

const resolveAndValidateForm = async ({ permitType, formVersionId, formValues }) => {
  if (!permitType.formId) return { formVersionId: formVersionId || null }
  const form = await repository.findFormById(permitType.formId)
  if (!form || !form.isActive) throw new ConflictError('The permit type is linked to an inactive form.')
  if (formVersionId) {
    const version = await repository.findFormVersionById(formVersionId)
    if (!version || version.formId !== form.id || version.status !== 'PUBLISHED') throw new ConflictError('The selected form version is not the published version for this permit type.')
    const validation = await formService.validateFormValues({ formKey: form.key, version: version.version, values: formValues })
    if (!validation.valid) throw new ConflictError('Permit form validation failed.')
    return { formVersionId: version.id }
  }
  const validation = await formService.validateFormValues({ formKey: form.key, values: formValues })
  if (!validation.valid) throw new ConflictError('Permit form validation failed.')
  return { formVersionId: validation.formVersionId }
}

const assertVerifiedProfessional = (professional) => {
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== 'VERIFIED') throw new ConflictError('The selected professional is not verified.')
  if (!professional.prcId || !professional.ptrNumber) throw new ConflictError('The selected professional has not completed PRC and PTR verification.')
}

const createApplication = async ({ userId, permitTypeId, professionalId, formVersionId, formValues }) => {
  const person = await getClientPerson(userId)
  const permitType = await repository.findPermitType(permitTypeId)
  if (!permitType) throw new NotFoundError('Active permit type not found.')
  const professional = await repository.findProfessional(professionalId)
  assertVerifiedProfessional(professional)
  const resolvedForm = await resolveAndValidateForm({ permitType, formVersionId, formValues })

  const application = await repository.withTransaction(async (tx) => {
    const created = await repository.create({ clientPersonId: person.id, permitTypeId, professionalId, formVersionId: resolvedForm.formVersionId, formValues, userId }, tx)
    if (!created) throw new NotFoundError('Active permit type not found.')
    if (created.notFound === 'professional') throw new NotFoundError('Professional registration not found.')
    const notificationContext = await getClientNotificationContext(person.id, tx)
    const workflow = await workflowService.startWorkflow({ workflowKey: WORKFLOW_KEY, subjectType: SUBJECT_TYPE, subjectId: created.id, actorId: userId, metadata: { source: 'obo-plan-permit.create', referenceNumber: created.referenceNumber, permitTypeName: permitType.name, ...notificationContext }, db: tx })
    return repository.update(created.id, { workflowInstanceId: workflow.id }, tx)
  })
  return withWorkflowState(application)
}

const getMine = async ({ id, userId }) => {
  const person = await getClientPerson(userId)
  const application = await repository.findOwnedByClient(id, person.id)
  if (!application) throw new NotFoundError('Permit application not found.')
  return withWorkflowState(application)
}

const listMine = async ({ userId }) => {
  const applications = await repository.listByClient((await getClientPerson(userId)).id)
  return Promise.all(applications.map(withWorkflowState))
}

const updateDraft = async ({ id, userId, professionalId, formVersionId, formValues }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) throw new ConflictError('Only draft applications can be updated.')
  const selectedProfessionalId = professionalId || application.professionalId
  const professional = await repository.findProfessional(selectedProfessionalId)
  assertVerifiedProfessional(professional)
  const resolvedForm = await resolveAndValidateForm({ permitType: application.permitType, formVersionId: formVersionId || application.formVersionId, formValues })
  return withWorkflowState(await repository.update(id, { professionalId: selectedProfessionalId, formVersionId: resolvedForm.formVersionId, formValues }))
}

const submit = async ({ id, userId }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) throw new ConflictError('Only draft applications can be submitted.')
  const notificationContext = await getClientNotificationContext(application.clientPersonId)
  await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey: 'SUBMIT_FOR_SUBMISSION', actorId: userId, metadata: { source: 'obo-plan-permit.submit', referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext } })
  return withWorkflowState(await repository.findById(id))
}

module.exports = { STATUS, WORKFLOW_KEY, SUBJECT_TYPE, createApplication, getMine, listMine, updateDraft, submit, getWorkflowState, withWorkflowState }

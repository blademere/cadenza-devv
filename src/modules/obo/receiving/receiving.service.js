const { ConflictError, NotFoundError } = require('../../../common/errors/appError')
const workflowService = require('../../../platform/workflow/workflow.service')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')
const repository = require('./receiving.repository')

const prisma = getPrismaClient()
const STATUS = Object.freeze({ SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION' })

const getWorkflowState = async (application) => {
  if (!application.workflowInstanceId) throw new ConflictError('Permit application is not attached to a workflow instance.')
  const workflow = await repository.findWorkflowInstance(application.workflowInstanceId)
  if (!workflow) throw new ConflictError('Permit application workflow instance was not found.')
  return workflow
}

const getNotificationContext = async (clientPersonId, db = prisma) => {
  const person = await db.person.findUnique({ where: { id: clientPersonId }, select: { userId: true, email: true, user: { select: { email: true } } } })
  return { clientUserId: person?.userId || null, clientEmail: person?.user?.email || person?.email || null }
}

const listApplications = ({ status }) => repository.listApplications(status)

const receiveHardcopy = async ({ id, actorId }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  if (workflow.currentStep.key !== STATUS.SUBMISSION_SCHEDULED) throw new ConflictError('Only scheduled applications can be received.')
  if (!application.submissionAppointment) throw new ConflictError('A hardcopy submission appointment is required.')
  const appointment = await repository.findSubmissionAppointment(application.submissionAppointment.appointmentId)
  if (!appointment) throw new ConflictError('The submission appointment no longer exists.')
  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') throw new ConflictError('The submission appointment is not valid for receiving.')
  if (appointment.slot.startsAt > new Date()) throw new ConflictError('The hardcopy submission appointment has not started yet.')
  if (application.professional.status !== 'VERIFIED') throw new ConflictError('The associated professional is not verified.')

  const submittedAt = application.submittedAt || new Date()
  await prisma.$transaction(async (tx) => {
    const notificationContext = await getNotificationContext(application.clientPersonId, tx)
    await workflowService.transitionWorkflow({
      instanceId: application.workflowInstanceId,
      transitionKey: 'RECEIVE_HARDCOPY',
      actorId,
      metadata: { source: 'obo-receiving.receive', appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext },
      db: tx,
    })
    await repository.updateApplication(id, { submittedAt }, tx)
  })

  return repository.findApplication(id)
}

const decide = async ({ id, actorId, decision, reason }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  if (workflow.currentStep.key !== STATUS.RECEIVING) throw new ConflictError('Application must be received before a receiving decision can be made.')
  const cleanReason = reason?.trim() || null
  if (decision === 'DECLINED' && !cleanReason) throw new ConflictError('A reason is required when declining an application.')

  const accepted = decision === 'ACCEPTED'
  const transitionKey = accepted ? 'ACCEPT_FOR_INSPECTION' : 'DECLINE'
  const result = await prisma.$transaction(async (tx) => {
    const notificationContext = await getNotificationContext(application.clientPersonId, tx)
    const nextWorkflow = await workflowService.transitionWorkflow({
      instanceId: application.workflowInstanceId,
      transitionKey,
      actorId,
      metadata: { source: 'obo-receiving.decide', decision, reason: cleanReason, referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext },
      db: tx,
    })

    const updated = await repository.updateApplication(id, { acceptedAt: accepted ? new Date() : null, acceptedByUserId: accepted ? actorId : null, declinedAt: accepted ? null : new Date(), declineReason: accepted ? null : cleanReason }, tx)
    await repository.addDecision({ applicationId: id, decision, reason: cleanReason, decidedByUserId: actorId }, tx)
    return { ...updated, status: nextWorkflow.currentStep.key, workflowInstanceId: nextWorkflow.id }
  })

  return result
}

module.exports = { STATUS, listApplications, receiveHardcopy, decide, getWorkflowState }

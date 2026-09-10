import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import * as formRepository from '../../../platform/forms/form.repository.js'
import * as workflowRepository from '../../../platform/workflow/workflow.repository.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'

const prisma = getPrismaClient()
const applicationInclude = {
  permitType: true,
  clientPerson: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true, email: true, phone: true } },
  submissionAppointment: true,
  decisions: { orderBy: { decidedAt: 'desc' } },
}

const attachAppointment = async (application, db = prisma) => {
  if (!application?.submissionAppointment?.appointmentId) return application
  const appointment = await appointmentService.getAppointmentForReference({ id: application.submissionAppointment.appointmentId, db })
  return { ...application, submissionAppointment: { ...application.submissionAppointment, appointment } }
}
const attachFormVersion = async (application, db = prisma) => {
  if (!application?.formVersionId) return { ...application, formVersion: null }
  const formVersion = await formRepository.findVersionById(application.formVersionId, db)
  return { ...application, formVersion }
}
const hydrateApplication = async (application, db = prisma) => {
  if (!application) return application
  return attachAppointment(await attachFormVersion(application, db), db)
}
const findApplication = async (id, db = prisma) => {
  const application = await db.oboPermitApplication.findUnique({ where: { id }, include: applicationInclude })
  return hydrateApplication(application, db)
}
const findWorkflowInstance = (id, db = prisma) => workflowRepository.findInstance(id, db)
const findSubmissionAppointment = (appointmentId, db = prisma) => appointmentService.getAppointmentForReference({ id: appointmentId, db })
const findPersonNotificationContext = (personId, db = prisma) => db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })

const listApplications = async (status, db = prisma) => {
  const applications = await db.oboPermitApplication.findMany({
    where: { workflowInstanceId: { not: null } },
    include: { permitType: true, clientPerson: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true, email: true, phone: true } }, submissionAppointment: true },
    orderBy: { createdAt: 'asc' },
  })
  const workflowIds = applications.map((application) => application.workflowInstanceId).filter(Boolean)
  const instances = workflowIds.length ? await workflowRepository.findInstancesByIds(workflowIds, db) : []
  const appointmentIds = applications.map((application) => application.submissionAppointment?.appointmentId).filter(Boolean)
  const appointments = appointmentIds.length ? await appointmentService.listAppointmentsForReferences({ ids: appointmentIds, db }) : []
  const stateById = new Map(instances.map((instance) => [instance.id, instance.currentStep.key]))
  const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]))

  const hydrated = await Promise.all(applications.map(async (application) => {
    const formVersion = application.formVersionId ? await formRepository.findVersionById(application.formVersionId, db) : null
    const workflowStatus = stateById.get(application.workflowInstanceId)
    if (!workflowStatus) return null
    const appointmentId = application.submissionAppointment?.appointmentId
    return { ...application, formVersion, status: workflowStatus, submissionAppointment: application.submissionAppointment ? { ...application.submissionAppointment, appointment: appointmentById.get(appointmentId) || null } : null }
  }))
  return hydrated.filter(Boolean).filter((application) => application.status === (status || 'SUBMISSION_SCHEDULED'))
}

const updateApplication = async (id, data, db = prisma) => {
  const application = await db.oboPermitApplication.update({ where: { id }, data, include: applicationInclude })
  return hydrateApplication(application, db)
}
const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })
const withTransaction = (callback) => prisma.$transaction(callback)

export { findApplication, findWorkflowInstance, findSubmissionAppointment, findPersonNotificationContext, listApplications, updateApplication, addDecision, withTransaction }

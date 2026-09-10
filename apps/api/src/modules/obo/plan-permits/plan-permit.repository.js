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

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findPersonNotificationContext = (personId, db = prisma) => db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })
const findById = async (id, db = prisma) => hydrateApplication(await db.oboPermitApplication.findUnique({ where: { id }, include: applicationInclude }), db)
const findOwnedByClient = async (id, clientPersonId, db = prisma) => hydrateApplication(await db.oboPermitApplication.findFirst({ where: { id, clientPersonId }, include: applicationInclude }), db)
const listByClient = async (clientPersonId, db = prisma) => {
  const applications = await db.oboPermitApplication.findMany({ where: { clientPersonId }, include: applicationInclude, orderBy: { createdAt: 'desc' } })
  return Promise.all(applications.map((application) => hydrateApplication(application, db)))
}
const create = (data, db = prisma) => db.oboPermitApplication.create({ data, include: applicationInclude })
const update = async (id, data, db = prisma) => hydrateApplication(await db.oboPermitApplication.update({ where: { id }, data, include: applicationInclude }), db)
const withTransaction = (callback) => prisma.$transaction(callback)

export { findPersonByUserId, findPersonNotificationContext, findById, findOwnedByClient, listByClient, create, update, withTransaction }

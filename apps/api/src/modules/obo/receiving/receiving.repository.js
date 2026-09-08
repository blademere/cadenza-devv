import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()
const formVersionInclude = { fields: { orderBy: { sortOrder: 'asc' } }, sections: { orderBy: { sortOrder: 'asc' } } }
const applicationInclude = {
  permitType: true,
  clientPerson: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      email: true,
      phone: true,
    },
  },
  submissionAppointment: true,
  decisions: { orderBy: { decidedAt: 'desc' } },
}

const attachAppointment = async (application, db = prisma) => {
  if (!application?.submissionAppointment?.appointmentId) return application
  const appointment = await db.appointment.findUnique({
    where: { id: application.submissionAppointment.appointmentId },
    include: { appointmentType: true, slot: true },
  })
  return {
    ...application,
    submissionAppointment: {
      ...application.submissionAppointment,
      appointment,
    },
  }
}

const attachFormVersion = async (application, db = prisma) => {
  if (!application?.formVersionId) return { ...application, formVersion: null }
  const formVersion = await db.formVersion.findUnique({
    where: { id: application.formVersionId },
    include: formVersionInclude,
  })
  return { ...application, formVersion }
}

const hydrateApplication = async (application, db = prisma) => {
  if (!application) return application
  const withForm = await attachFormVersion(application, db)
  return attachAppointment(withForm, db)
}

const findApplication = async (id, db = prisma) => {
  const application = await db.oboPermitApplication.findUnique({ where: { id }, include: applicationInclude })
  return hydrateApplication(application, db)
}
const findWorkflowInstance = (id, db = prisma) => db.workflowInstance.findUnique({ where: { id }, include: { currentStep: true } })
const findSubmissionAppointment = (appointmentId, db = prisma) => db.appointment.findUnique({ where: { id: appointmentId }, include: { appointmentType: true, slot: true } })
const findPersonNotificationContext = (personId, db = prisma) => db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })

const listApplications = async (status, db = prisma) => {
  const applications = await db.oboPermitApplication.findMany({
    where: { workflowInstanceId: { not: null } },
    include: {
      permitType: true,
      clientPerson: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          email: true,
          phone: true,
        },
      },
      submissionAppointment: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  const workflowIds = applications.map((application) => application.workflowInstanceId).filter(Boolean)
  const instances = await db.workflowInstance.findMany({ where: { id: { in: workflowIds } }, include: { currentStep: true } })
  const appointmentIds = applications.map((application) => application.submissionAppointment?.appointmentId).filter(Boolean)
  const appointments = await db.appointment.findMany({
    where: { id: { in: appointmentIds } },
    include: { appointmentType: true, slot: true },
  })
  const stateById = new Map(instances.map((instance) => [instance.id, instance.currentStep.key]))
  const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]))

  const hydrated = await Promise.all(applications.map(async (application) => {
    const formVersion = application.formVersionId
      ? await db.formVersion.findUnique({ where: { id: application.formVersionId }, include: formVersionInclude })
      : null
    const workflowStatus = stateById.get(application.workflowInstanceId)
    if (!workflowStatus) return null
    const appointmentId = application.submissionAppointment?.appointmentId
    return {
      ...application,
      formVersion,
      status: workflowStatus,
      submissionAppointment: application.submissionAppointment
        ? { ...application.submissionAppointment, appointment: appointmentById.get(appointmentId) || null }
        : null,
    }
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

const { getPrismaClient } = require('../../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const findApplication = (id, db = prisma) => db.oboPermitApplication.findUnique({
  where: { id },
  include: {
    permitType: true,
    professional: true,
    submissionAppointment: true,
    decisions: { orderBy: { decidedAt: 'desc' } },
  },
})

const findWorkflowInstance = (id, db = prisma) => db.workflowInstance.findUnique({
  where: { id },
  include: { currentStep: true },
})

const findSubmissionAppointment = (appointmentId, db = prisma) => db.appointment.findUnique({
  where: { id: appointmentId },
  include: { slot: true },
})

const findPersonNotificationContext = (personId, db = prisma) => db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })

const listApplications = async (status, db = prisma) => {
  const applications = await db.oboPermitApplication.findMany({
    where: { workflowInstanceId: { not: null } },
    include: { permitType: true, professional: true, submissionAppointment: true },
    orderBy: { createdAt: 'asc' },
  })

  const workflowIds = applications.map((application) => application.workflowInstanceId).filter(Boolean)
  const instances = await db.workflowInstance.findMany({
    where: { id: { in: workflowIds } },
    include: { currentStep: true },
  })
  const stateById = new Map(instances.map((instance) => [instance.id, instance.currentStep.key]))

  return applications
    .map((application) => {
      const workflowStatus = stateById.get(application.workflowInstanceId)
      if (!workflowStatus) return null
      return { ...application, status: workflowStatus }
    })
    .filter(Boolean)
    .filter((application) => application.status === (status || 'SUBMISSION_SCHEDULED'))
}

const updateApplication = (id, data, db = prisma) => db.oboPermitApplication.update({
  where: { id },
  data,
  include: { permitType: true, professional: true, submissionAppointment: true },
})

const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })
const withTransaction = (callback) => prisma.$transaction(callback)

module.exports = {
  findApplication,
  findWorkflowInstance,
  findSubmissionAppointment,
  findPersonNotificationContext,
  listApplications,
  updateApplication,
  addDecision,
  withTransaction,
}

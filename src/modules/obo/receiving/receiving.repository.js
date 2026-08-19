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

const listApplications = (status, db = prisma) => db.oboPermitApplication.findMany({
  where: { workflowInstanceId: { not: null } },
  include: { permitType: true, professional: true, submissionAppointment: true },
  orderBy: { createdAt: 'asc' },
}).then(async (applications) => {
  const instances = await db.workflowInstance.findMany({
    where: { id: { in: applications.map((application) => application.workflowInstanceId).filter(Boolean) } },
    include: { currentStep: true },
  })
  const stateById = new Map(instances.map((instance) => [instance.id, instance.currentStep.key]))
  return applications
    .map((application) => ({ ...application, status: stateById.get(application.workflowInstanceId) || application.status }))
    .filter((application) => application.status === (status || 'SUBMISSION_SCHEDULED'))
})

const updateApplication = (id, data, db = prisma) => db.oboPermitApplication.update({
  where: { id },
  data,
  include: { permitType: true, professional: true, submissionAppointment: true },
})

const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })

module.exports = {
  findApplication,
  findWorkflowInstance,
  findSubmissionAppointment,
  listApplications,
  updateApplication,
  addDecision,
}

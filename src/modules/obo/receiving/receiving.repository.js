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

const findSubmissionAppointment = (appointmentId, db = prisma) => db.appointment.findUnique({
  where: { id: appointmentId },
  include: { slot: true },
})

const listApplications = (status, db = prisma) => db.oboPermitApplication.findMany({
  where: status ? { status } : { status: 'SUBMISSION_SCHEDULED' },
  include: { permitType: true, professional: true, submissionAppointment: true },
  orderBy: { createdAt: 'asc' },
})

const updateApplication = (id, data, db = prisma) => db.oboPermitApplication.update({
  where: { id },
  data,
  include: { permitType: true, professional: true, submissionAppointment: true },
})

const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })

module.exports = {
  findApplication,
  findSubmissionAppointment,
  listApplications,
  updateApplication,
  addDecision,
}

import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createSubmissionAppointment = (data, db = prisma) =>
  db.oboSubmissionAppointment.create({ data })

const updateSubmissionAppointment = (applicationId, appointmentId, db = prisma) =>
  db.oboSubmissionAppointment.update({
    where: { applicationId },
    data: { appointmentId },
  })

const findPersonNotificationContext = (personId, db = prisma) =>
  db.person.findUnique({
    where: { id: personId },
    select: {
      userId: true,
      email: true,
      user: { select: { email: true } },
    },
  })

const withTransaction = (callback) => prisma.$transaction(callback)

export {
  createSubmissionAppointment,
  updateSubmissionAppointment,
  findPersonNotificationContext,
  withTransaction,
}

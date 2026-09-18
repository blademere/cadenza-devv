import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getDb = (db) => db || prisma

const createObligation = (data, db) => getDb(db).paymentObligation.create({ data })

const findObligationById = (id, db) =>
  getDb(db).paymentObligation.findUnique({
    where: { id },
    include: { payments: { orderBy: { createdAt: 'asc' } } },
  })

const findObligationByReference = (referenceType, referenceId, db) =>
  getDb(db).paymentObligation.findUnique({
    where: { referenceType_referenceId: { referenceType, referenceId } },
    include: { payments: { orderBy: { createdAt: 'asc' } } },
  })

const createPayment = (data, db) => getDb(db).payment.create({ data })

const findPaymentByIdempotencyKey = (idempotencyKey, db) =>
  getDb(db).payment.findUnique({ where: { idempotencyKey } })

const updatePayment = (id, data, db) =>
  getDb(db).payment.update({ where: { id }, data })

const listSuccessfulPayments = (obligationId, db) =>
  getDb(db).payment.findMany({
    where: { obligationId, status: 'SUCCEEDED' },
    orderBy: { createdAt: 'asc' },
  })

const createRefund = (data, db) => getDb(db).paymentRefund.create({ data })

export {
  createObligation,
  findObligationById,
  findObligationByReference,
  createPayment,
  findPaymentByIdempotencyKey,
  updatePayment,
  listSuccessfulPayments,
  createRefund,
}

import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getDb = (db) => db || prisma
const withTransaction = (callback, db) => getDb(db).$transaction(callback)

const createObligation = (data, db) => getDb(db).paymentObligation.create({ data })

const findObligationById = (id, appId, db) =>
  getDb(db).paymentObligation.findFirst({
    where: { id, appId },
    include: { payments: { orderBy: { createdAt: 'asc' } } },
  })

const findObligationByReference = (appId, referenceType, referenceId, db) =>
  getDb(db).paymentObligation.findUnique({
    where: { appId_referenceType_referenceId: { appId, referenceType, referenceId } },
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
  withTransaction,
}

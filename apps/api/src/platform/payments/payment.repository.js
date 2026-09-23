import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()
const getDb = (db) => db || prisma
const withTransaction = (callback, db) => getDb(db).$transaction(callback)
const lockObligation = (id, appId, db) => getDb(db).$queryRaw`SELECT "id" FROM "PaymentObligation" WHERE "id" = ${id} AND "appId" = ${appId} FOR UPDATE`
const lockPayment = (id, appId, db) => getDb(db).$queryRaw`SELECT p."id" FROM "Payment" p INNER JOIN "PaymentObligation" o ON o."id" = p."obligationId" WHERE p."id" = ${id} AND o."appId" = ${appId} FOR UPDATE`
const createObligation = (data, db) => getDb(db).paymentObligation.create({ data })
const findObligationById = (id, appId, db) => getDb(db).paymentObligation.findFirst({ where: { id, appId }, include: { payments: { orderBy: { createdAt: 'asc' }, include: { refunds: { orderBy: { createdAt: 'asc' } } } } } })
const findObligationByIdGlobal = (id, db) => getDb(db).paymentObligation.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: 'asc' }, include: { refunds: { orderBy: { createdAt: 'asc' } } } } } })
const findObligationByReference = (appId, referenceType, referenceId, db) => getDb(db).paymentObligation.findUnique({ where: { appId_referenceType_referenceId: { appId, referenceType, referenceId } }, include: { payments: { orderBy: { createdAt: 'asc' }, include: { refunds: { orderBy: { createdAt: 'asc' } } } } } })
const listObligationsByApp = (appId, db = prisma) => db.paymentObligation.findMany({ where: { appId }, orderBy: { createdAt: 'desc' }, include: { payments: { orderBy: { createdAt: 'asc' }, include: { refunds: { orderBy: { createdAt: 'asc' } } } } } })
const createPayment = (data, db) => getDb(db).payment.create({ data })
const updateObligationStatus = (id, status, db) => getDb(db).paymentObligation.update({ where: { id }, data: { status } })
const findPaymentByIdempotencyKey = (idempotencyKey, db) => getDb(db).payment.findUnique({ where: { idempotencyKey } })
const findPaymentById = (id, appId, db) => getDb(db).payment.findFirst({ where: { id, obligation: { appId } }, include: { refunds: { orderBy: { createdAt: 'asc' } }, obligation: true } })
const updatePayment = (id, data, db) => getDb(db).payment.update({ where: { id }, data })
const listSuccessfulPayments = (obligationId, db) => getDb(db).payment.findMany({ where: { obligationId, status: 'SUCCEEDED' }, orderBy: { createdAt: 'asc' } })
const listPayments = (obligationId, appId, db) => getDb(db).payment.findMany({ where: { obligationId, obligation: { appId } }, orderBy: { createdAt: 'asc' }, include: { refunds: { orderBy: { createdAt: 'asc' } } } })
const createRefund = (data, db) => getDb(db).paymentRefund.create({ data })
export { createObligation, findObligationById, findObligationByIdGlobal, findObligationByReference, listObligationsByApp, createPayment, updateObligationStatus, findPaymentByIdempotencyKey, findPaymentById, updatePayment, listSuccessfulPayments, listPayments, createRefund, withTransaction, lockObligation, lockPayment }
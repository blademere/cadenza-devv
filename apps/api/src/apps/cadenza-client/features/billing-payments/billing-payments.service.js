import { BadRequestError, NotFoundError, ConflictError } from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();
const normalizeType = (type) => {
  const value = String(type || '').toUpperCase().replace(/[ -]/g, '_');
  if (['ENROLLMENT', 'ROOM_BOOKING', 'INSTRUMENT_RENTAL'].includes(value)) return value;
  throw new BadRequestError('Unsupported billing transaction type.');
};
const modelFor = (db, type) => type === 'ENROLLMENT' ? db.cadenzaEnrollment :
  type === 'ROOM_BOOKING' ? db.cadenzaRoomBooking : db.cadenzaRental;
const assertReady = (record, type) => {
  if (!record) throw new NotFoundError('Billing transaction not found.');
  if (type === 'ENROLLMENT' && record.status !== 'APPROVED') throw new BadRequestError('Enrollment must be approved before cashier payment.');
  if (type !== 'ENROLLMENT' && record.status !== 'COMPLETED') throw new BadRequestError('Complete the rental or room booking before recording continuation payments.');
};
const totalFor = (record, type) => Number(type === 'ENROLLMENT' ? record.priceAtEnrollment : record.totalAmount);
const initialPaid = (record) => {
  const m = record.metadata || {};
  if (m.paymentStatus === 'PENDING_CONFIRMATION') return 0;
  return Number(m.initialPaymentAmount ?? m.paymentAmount ?? 0);
};
const cents = (value) => Math.round(Number(value) * 100);
const validateCents = (value) => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value))) throw new BadRequestError('Amount must use at most two decimal places.');
  const n = cents(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new BadRequestError('A positive payment amount is required.');
  return n;
};

export const billingPaymentsService = {
  async listPayments(appId) {
    return prisma.cadenzaCashierPayment.findMany({ where: { appId }, orderBy: { createdAt: 'asc' } });
  },
  async recordPayment(appId, userId, input) {
    const type = normalizeType(input?.type);
    const id = String(input?.id || '');
    const method = String(input?.method || '').trim().toUpperCase().replace(/\s+/g, '_');
    const reference = String(input?.reference || '').trim();
    const key = input?.idempotencyKey;
    if (!id || !Number.isInteger(userId) || userId <= 0) throw new BadRequestError('A valid transaction and staff account are required.');
    if (!['CASH', 'GCASH', 'BANK_TRANSFER'].includes(method)) throw new BadRequestError('Unsupported payment method.');
    if (reference.length < 3 || reference.length > 100) throw new BadRequestError('Payment reference must be 3–100 characters.');
    if (typeof key !== 'string' || key.length < 16 || key.length > 128) throw new BadRequestError('A payment idempotency key is required.');
    const amountCents = validateCents(input.amount);
    try {
      return await prisma.$transaction(async (db) => {
        // Safe table selection: the name comes only from a fixed allowlist, never from user input.
        const table = type === 'ENROLLMENT' ? 'CadenzaEnrollment' : type === 'ROOM_BOOKING' ? 'CadenzaRoomBooking' : 'CadenzaRental';
        const locked = await db.$queryRawUnsafe('SELECT id FROM "' + table + '" WHERE id = $1 AND "appId" = $2 FOR UPDATE', id, appId);
        if (!locked.length) throw new NotFoundError('Billing transaction not found.');
        const prior = await db.cadenzaCashierPayment.findFirst({ where: { appId, idempotencyKey: key } });
        if (prior) {
          if (prior.transactionType !== type || prior.sourceId !== id || cents(prior.amount) !== amountCents || prior.method !== method || prior.reference !== reference) {
            throw new ConflictError('Idempotency key has already been used for a different payment.');
          }
          return { payment: prior, duplicate: true };
        }
        const model = modelFor(db, type);
        const record = await model.findFirst({ where: { id, appId } });
        assertReady(record, type);
        const totalCents = cents(totalFor(record, type));
        if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new BadRequestError('Invalid transaction total.');
        const previous = await db.cadenzaCashierPayment.findMany({
          where: { appId, transactionType: type, sourceId: id }, select: { amount: true },
        });
        const recordedCents = previous.reduce((sum, p) => sum + cents(p.amount), 0);
        const initialCents = cents(initialPaid(record));
        const due = totalCents - initialCents - recordedCents;
        if (due <= 0) throw new ConflictError('No outstanding balance remains.');
        if (amountCents > due) throw new BadRequestError('Payment exceeds the outstanding balance.');
        const payment = await db.cadenzaCashierPayment.create({
          data: { appId, transactionType: type, sourceId: id, amount: amountCents / 100, method, reference, idempotencyKey: key, processedByUserId: userId },
        });
        const paid = initialCents + recordedCents + amountCents;
        const metadata = record.metadata || {};
        await model.update({ where: { id }, data: { metadata: {
          ...metadata,
          initialPaymentAmount: initialCents / 100,
          paymentAmount: paid / 100,
          remainingAmount: (totalCents - paid) / 100,
          paymentBalanceDue: (totalCents - paid) / 100,
          paymentStatus: paid >= totalCents ? 'PAID' : 'PARTIALLY_PAID',
          paymentContinuationRequired: paid < totalCents,
          paymentContinuationStatus: paid >= totalCents ? 'PAID' : 'PENDING',
          ...(paid >= totalCents ? { paymentCompletedAt: new Date().toISOString() } : {}),
        } } });
        await db.cadenzaAuditLog.create({ data: {
          appId, personId: null, action: 'PAYMENT_RECORDED', entityType: type,
          entityId: id, description: 'Cashier payment recorded',
          metadata: { paymentId: payment.id, amount: amountCents / 100, method, reference, processedByUserId: userId },
        } });
        return { payment, duplicate: false, totalPaid: paid / 100, remainingAmount: (totalCents - paid) / 100 };
      }, { timeout: 10000 });
    } catch (error) {
      if (error?.code === 'P2002') throw new ConflictError('Payment reference or request has already been recorded.');
      throw error;
    }
  },
};

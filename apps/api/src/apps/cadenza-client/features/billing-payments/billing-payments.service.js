import { BadRequestError, NotFoundError, ConflictError } from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();
const refundNotification = async (db, { appId, customerId, transactionType, sourceId, refund }) => {
  const customer = await db.cadenzaCustomer.findFirst({
    where: { appId, id: customerId },
    select: { person: { select: { userId: true } } },
  });
  const recipientId = customer?.person?.userId;
  if (!recipientId) return;
  const name = transactionType === 'ENROLLMENT' ? 'Enrollment' :
    transactionType === 'ROOM_BOOKING' ? 'Room booking' : 'Instrument rental';
  const amount = Number(refund.amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  await db.notification.upsert({
    where: { idempotencyKey: `cadenza-refund:${refund.id}` },
    create: {
      userId: recipientId,
      type: 'PAYMENT_REFUNDED',
      title: `${name} refund recorded`,
      message: `Your ${name.toLowerCase()} refund of ₱${amount} has been recorded. Refund reference: ${refund.reference}.`,
      data: { appId, transactionType, sourceId, refundId: refund.id, amount: Number(refund.amount), reference: refund.reference, method: refund.method },
      idempotencyKey: `cadenza-refund:${refund.id}`,
    },
    update: {},
  });
};


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
const unverifiedSubmittedCents = (record) => {
  const m = record.metadata || {};
  if (m.paymentStatus !== 'PENDING_CONFIRMATION') return 0;
  const total = cents(record.priceAtEnrollment || 0);
  const stated = cents(m.initialPaymentAmount ?? m.paymentAmount ?? 0);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(stated) || total <= 0 || stated <= 0) return 0;
  return Math.min(total, stated);
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
  async getBookingRentalRefundQuote(appId, type, sourceId) {
    const transactionType = normalizeType(type);
    if (transactionType === 'ENROLLMENT') throw new BadRequestError('Use the enrollment refund endpoint.');
    const record = await modelFor(prisma, transactionType).findFirst({
      where: { id: sourceId, appId },
    });
    if (!record) throw new NotFoundError('Transaction not found.');
    const [payments, refund] = await Promise.all([
      prisma.cadenzaCashierPayment.findMany({
        where: { appId, transactionType, sourceId }, select: { amount: true },
      }),
      prisma.cadenzaBookingRentalRefund.findFirst({
        where: { appId, transactionType, sourceId },
      }),
    ]);
    const metadata = record.metadata || {};
    const original = metadata.paymentStatus === 'PENDING_CONFIRMATION' ||
      metadata.paymentStatus === 'PENDING_PROCEED'
      ? 0 : cents(metadata.initialPaymentAmount ?? metadata.paymentAmount ?? 0);
    const cashier = payments.reduce((sum, payment) => sum + cents(payment.amount), 0);
    const submitted = ['PENDING_CONFIRMATION', 'PENDING_PROCEED'].includes(metadata.paymentStatus)
      ? Math.max(0, cents(metadata.initialPaymentAmount ?? metadata.paymentAmount ?? 0)) : 0;
    const total = cents(record.totalAmount);
    const paid = Math.max(0, original + cashier);
    const refundable = refund ? 0 : Math.min(total, paid + submitted);
    return {
      transactionType, sourceId, status: record.status,
      paidAmount: paid / 100, unverifiedSubmittedAmount: refund ? 0 : submitted / 100,
      refundedAmount: refund ? Number(refund.amount) : 0,
      refundableAmount: refundable / 100, refund,
    };
  },

  async recordBookingRentalRefund(appId, userId, type, sourceId, input) {
    const transactionType = normalizeType(type);
    if (transactionType === 'ENROLLMENT') throw new BadRequestError('Use the enrollment refund endpoint.');
    const method = String(input?.method || '').trim().toUpperCase().replace(/\s+/g, '_');
    const reference = String(input?.reference || '').trim();
    if (!Number.isInteger(userId) || userId <= 0) throw new BadRequestError('A staff account is required.');
    if (!['CASH', 'GCASH', 'BANK_TRANSFER'].includes(method)) throw new BadRequestError('Invalid refund method.');
    if (reference.length < 3 || reference.length > 100) throw new BadRequestError('A refund receipt or transfer reference is required.');
    if (input?.confirmedReturned !== true) throw new BadRequestError('Confirm the refund was already transferred to the client.');
    try {
      return await prisma.$transaction(async (db) => {
        const table = transactionType === 'ROOM_BOOKING' ? 'CadenzaRoomBooking' : 'CadenzaRental';
        const locked = await db.$queryRawUnsafe(
          'SELECT id FROM "' + table + '" WHERE id = $1 AND "appId" = $2 FOR UPDATE',
          sourceId, appId,
        );
        if (!locked.length) throw new NotFoundError('Transaction not found.');
        const existing = await db.cadenzaBookingRentalRefund.findFirst({
          where: { appId, transactionType, sourceId },
        });
        if (existing) throw new ConflictError('This transaction has already been refunded.');
        const model = modelFor(db, transactionType);
        const record = await model.findFirst({ where: { id: sourceId, appId } });
        if (!['CANCELLED', 'REJECTED'].includes(record.status)) {
          throw new BadRequestError('Only cancelled or rejected transactions can be refunded.');
        }
        const metadata = record.metadata || {};
        const submitted = ['PENDING_CONFIRMATION', 'PENDING_PROCEED'].includes(metadata.paymentStatus)
          ? Math.max(0, cents(metadata.initialPaymentAmount ?? metadata.paymentAmount ?? 0)) : 0;
        if (submitted && input?.confirmedReceived !== true) {
          throw new BadRequestError('Verify the original submitted payment was received before refunding.');
        }
        const original = submitted ? 0 : cents(metadata.initialPaymentAmount ?? metadata.paymentAmount ?? 0);
        const prior = await db.cadenzaCashierPayment.findMany({
          where: { appId, transactionType, sourceId }, select: { amount: true },
        });
        const paid = original + submitted + prior.reduce((sum, p) => sum + cents(p.amount), 0);
        const maximum = cents(record.totalAmount);
        if (!Number.isSafeInteger(paid) || !Number.isSafeInteger(maximum) || maximum <= 0 ||
            paid <= 0 || paid > maximum) {
          throw new BadRequestError('Refund cannot exceed valid payments or the transaction total.');
        }
        const refund = await db.cadenzaBookingRentalRefund.create({
          data: { appId, transactionType, sourceId, amount: paid / 100, method, reference, processedByUserId: userId },
        });
        await model.update({
          where: { id: sourceId },
          data: { metadata: {
            ...metadata, paymentStatus: 'REFUNDED', refundStatus: 'RECORDED',
            refundAmount: paid / 100, refundReference: reference, refundMethod: method,
            refundedAt: refund.createdAt.toISOString(), netPaidAmount: 0,
            remainingAmount: 0, paymentBalanceDue: 0, paymentContinuationRequired: false,
          } },
        });
        await db.cadenzaAuditLog.create({
          data: {
            appId, personId: null, action: 'BOOKING_RENTAL_REFUND_RECORDED',
            entityType: transactionType, entityId: sourceId,
            description: 'Staff confirmed external refund and recorded accounting deduction',
            metadata: { refundId: refund.id, amount: paid / 100, method, reference, processedByUserId: userId },
          },
        });
        await refundNotification(db, {
          appId, customerId: record.customerId, transactionType, sourceId, refund,
        });
        return refund;
      }, { timeout: 10000 });
    } catch (error) {
      if (error?.code === 'P2002') throw new ConflictError('Refund already recorded.');
      throw error;
    }
  },

  async getEnrollmentRefundQuote(appId, enrollmentId) {
    const enrollment = await prisma.cadenzaEnrollment.findFirst({
      where: { id: enrollmentId, appId },
      select: { id: true, status: true, metadata: true, priceAtEnrollment: true },
    });
    if (!enrollment) throw new NotFoundError('Enrollment not found.');
    const [cashierPayments, refund] = await Promise.all([
      prisma.cadenzaCashierPayment.findMany({
        where: { appId, transactionType: 'ENROLLMENT', sourceId: enrollmentId },
        select: { amount: true },
      }),
      prisma.cadenzaEnrollmentRefund.findFirst({ where: { appId, enrollmentId } }),
    ]);
    const initial = cents(initialPaid(enrollment));
    const recorded = cashierPayments.reduce((sum, item) => sum + cents(item.amount), 0);
    const verifiedTotal = Math.max(0, initial + recorded);
    const submitted = unverifiedSubmittedCents(enrollment);
    const refunded = refund ? cents(refund.amount) : 0;
    // Show the submitted payment as refundable only after staff verifies receipt.
    // Never include an already-recorded refund as available again.
    const available = refund ? 0 : verifiedTotal + submitted;
    return {
      enrollmentId,
      status: enrollment.status,
      paidAmount: Math.max(verifiedTotal, refunded) / 100,
      refundedAmount: refunded / 100,
      unverifiedSubmittedAmount: refund ? 0 : submitted / 100,
      refundableAmount: available / 100,
      refund: refund || null,
    };
  },

  async recordEnrollmentRefund(appId, userId, enrollmentId, input) {
    const method = String(input?.method || '').trim().toUpperCase().replace(/\s+/g, '_');
    const reference = String(input?.reference || '').trim();
    if (!Number.isInteger(userId) || userId <= 0) throw new BadRequestError('An authenticated staff account is required.');
    if (!['CASH', 'GCASH', 'BANK_TRANSFER'].includes(method)) throw new BadRequestError('Choose the method used to return the money.');
    if (reference.length < 3 || reference.length > 100) throw new BadRequestError('A refund transfer reference or receipt number is required.');
    if (input?.confirmedReturned !== true) throw new BadRequestError('Confirm the refund has already been returned to the client before recording it.');
    try {
      return await prisma.$transaction(async (db) => {
        const locked = await db.$queryRaw`SELECT id FROM "CadenzaEnrollment" WHERE id = ${enrollmentId} AND "appId" = ${appId} FOR UPDATE`;
        if (!locked.length) throw new NotFoundError('Enrollment not found.');
        const existingRefund = await db.cadenzaEnrollmentRefund.findFirst({ where: { appId, enrollmentId } });
        if (existingRefund) throw new ConflictError('This enrollment has already been refunded.');
        const record = await db.cadenzaEnrollment.findFirst({ where: { appId, id: enrollmentId } });
        if (record.status !== 'CANCELLED') throw new BadRequestError('Only cancelled enrollments can be refunded.');
        const cashierPayments = await db.cadenzaCashierPayment.findMany({
          where: { appId, transactionType: 'ENROLLMENT', sourceId: enrollmentId }, select: { amount: true },
        });
        const submittedCents = unverifiedSubmittedCents(record);
        if (submittedCents > 0 && input?.confirmedReceived !== true) {
          throw new BadRequestError('Confirm the original payment was received before recording its refund.');
        }
        const verifiedTotal = cents(initialPaid(record)) + submittedCents +
          cashierPayments.reduce((sum, item) => sum + cents(item.amount), 0);
        if (!Number.isSafeInteger(verifiedTotal) || verifiedTotal <= 0) {
          throw new BadRequestError('No confirmed received payment is recorded for this enrollment. Verify receipt before processing a refund.');
        }
        const refund = await db.cadenzaEnrollmentRefund.create({
          data: { appId, enrollmentId, amount: verifiedTotal / 100, method, reference, processedByUserId: userId },
        });
        const metadata = record.metadata || {};
        await db.cadenzaEnrollment.update({
          where: { id: enrollmentId },
          data: { metadata: {
            ...metadata,
            refundStatus: 'RECORDED',
            paymentStatus: 'REFUNDED',
            refundAmount: verifiedTotal / 100,
            refundedAt: refund.createdAt.toISOString(),
            refundReference: reference,
            refundMethod: method,
            ...(submittedCents > 0 ? { paymentVerifiedAt: new Date().toISOString() } : {}),
            netPaidAmount: 0,
            remainingAmount: 0,
            paymentBalanceDue: 0,
            paymentContinuationRequired: false,
          } },
        });
        await db.cadenzaAuditLog.create({
          data: {
            appId, personId: null, action: 'ENROLLMENT_REFUND_RECORDED',
            entityType: 'ENROLLMENT', entityId: enrollmentId,
            description: 'Staff confirmed external refund and recorded ledger deduction',
            metadata: { refundId: refund.id, amount: verifiedTotal / 100, method, reference, confirmedOriginalPayment: submittedCents > 0, processedByUserId: userId },
          },
        });
        await refundNotification(db, {
          appId, customerId: record.customerId, transactionType: 'ENROLLMENT', sourceId: enrollmentId, refund,
        });
        return refund;
      }, { timeout: 10000 });
    } catch (error) {
      if (error?.code === 'P2002') throw new ConflictError('This refund was already recorded.');
      throw error;
    }
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

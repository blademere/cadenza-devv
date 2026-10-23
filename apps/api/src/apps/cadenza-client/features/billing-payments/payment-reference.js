import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { BadRequestError, ConflictError } from '../../../../common/errors/appError.js';

const prisma = getPrismaClient();
export const normalizePaymentReference = (reference) => {
  if (typeof reference !== 'string' || reference.trim().length < 3 || reference.trim().length > 100)
    throw new BadRequestError('Payment reference must be between 3 and 100 characters.');
  return reference.trim().toUpperCase();
};

// Checks both submitted references and cashier records within this app.
// Payment verification remains manual; a reference is NOT proof of payment.
export const assertUnusedPaymentReference = async (appId, reference) => {
  const normalized = normalizePaymentReference(reference);
  const filters = { appId, metadata: { path: ['paymentReference'], equals: normalized, mode: 'insensitive' } };
  const [enrollment, room, rental, cashier] = await Promise.all([
    prisma.cadenzaEnrollment.findFirst({ where: filters, select: { id: true } }),
    prisma.cadenzaRoomBooking.findFirst({ where: filters, select: { id: true } }),
    prisma.cadenzaRental.findFirst({ where: filters, select: { id: true } }),
    prisma.cadenzaCashierPayment.findFirst({ where: { appId, reference: { equals: reference.trim(), mode: 'insensitive' } }, select: { id: true } }),
  ]);
  if (enrollment || room || rental || cashier) throw new ConflictError('Payment reference already submitted. Check your transaction history instead of submitting again.');
  return normalized;
};

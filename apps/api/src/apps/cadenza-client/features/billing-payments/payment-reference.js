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
  // Prisma's `mode` filter is not supported for JSON path equality on all
  // deployed Prisma versions. Load only the app's references and normalize
  // them in JavaScript so payment submission cannot become a 500 because of
  // an unsupported JSON filter argument.
  const cashierPaymentsPromise = prisma.cadenzaCashierPayment.findMany({
    where: { appId },
    select: { id: true, reference: true },
  }).catch((error) => {
    // Cashier ledger was introduced after the original enrollment tables.
    // An older production database must not make client enrollment payment
    // submission fail until that migration is deployed.
    if (error?.code === 'P2021' || error?.code === 'P2022') return [];
    throw error;
  });
  const [enrollments, rooms, rentals, cashierPayments] = await Promise.all([
    prisma.cadenzaEnrollment.findMany({ where: { appId }, select: { id: true, metadata: true } }),
    prisma.cadenzaRoomBooking.findMany({ where: { appId }, select: { id: true, metadata: true } }),
    prisma.cadenzaRental.findMany({ where: { appId }, select: { id: true, metadata: true } }),
    cashierPaymentsPromise,
  ]);
  const matches = (items, getReference) => items.find((item) => {
    const value = getReference(item);
    return typeof value === 'string' && value.trim().toUpperCase() === normalized;
  });
  const enrollment = matches(enrollments, (item) => item.metadata?.paymentReference);
  const room = matches(rooms, (item) => item.metadata?.paymentReference);
  const rental = matches(rentals, (item) => item.metadata?.paymentReference);
  const cashier = matches(cashierPayments, (item) => item.reference);
  if (enrollment || room || rental || cashier) throw new ConflictError('Payment reference already submitted. Check your transaction history instead of submitting again.');
  return normalized;
};

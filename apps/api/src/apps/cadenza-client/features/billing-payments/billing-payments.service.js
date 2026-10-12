import { BadRequestError, NotFoundError } from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const normalizeType = (type) => {
  const value = String(type || '').toUpperCase().replace(/[ -]/g, '_');
  if (value === 'ENROLLMENT') return 'ENROLLMENT';
  if (value === 'ROOM_BOOKING') return 'ROOM_BOOKING';
  if (value === 'INSTRUMENT_RENTAL') return 'INSTRUMENT_RENTAL';
  throw new BadRequestError('Unsupported billing transaction type.');
};

const paidMetadata = (metadata, totalAmount) => ({
  ...(metadata || {}),
  paymentAmount: totalAmount,
  initialPaymentAmount: totalAmount,
  remainingAmount: 0,
  paymentStatus: 'PAID',
  paymentContinuationStatus: 'PAID',
  paymentContinuationRequired: false,
  paymentCompletedAt: new Date().toISOString(),
});

export const billingPaymentsService = {
  async markPaid(appId, { type, id }) {
    if (!id) throw new BadRequestError('A billing transaction ID is required.');

    const transactionType = normalizeType(type);

    if (transactionType === 'ENROLLMENT') {
      const record = await prisma.cadenzaEnrollment.findFirst({
        where: { id, appId },
        include: { lessonPackage: true },
      });
      if (!record) throw new NotFoundError('Enrollment billing transaction not found.');
      const totalAmount = Number(record.lessonPackage?.price || 0);
      return prisma.cadenzaEnrollment.update({
        where: { id: record.id },
        data: { metadata: paidMetadata(record.metadata, totalAmount) },
      });
    }

    if (transactionType === 'ROOM_BOOKING') {
      const record = await prisma.cadenzaRoomBooking.findFirst({ where: { id, appId } });
      if (!record) throw new NotFoundError('Room booking billing transaction not found.');
      const totalAmount = Number(record.totalAmount || 0);
      return prisma.cadenzaRoomBooking.update({
        where: { id: record.id },
        data: { metadata: paidMetadata(record.metadata, totalAmount) },
      });
    }

    const record = await prisma.cadenzaRental.findFirst({ where: { id, appId } });
    if (!record) throw new NotFoundError('Instrument rental billing transaction not found.');
    const totalAmount = Number(record.totalAmount || 0);
    return prisma.cadenzaRental.update({
      where: { id: record.id },
      data: { metadata: paidMetadata(record.metadata, totalAmount) },
    });
  },
};

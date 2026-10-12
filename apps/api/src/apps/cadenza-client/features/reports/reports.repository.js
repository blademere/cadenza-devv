import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const range = (from, to) => ({ gte: from, lt: to });

export const reportsRepository = {
  async findEnrollments(appId, from, to) {
    return prisma.cadenzaEnrollment.findMany({
      where: { appId, createdAt: range(from, to) },
      include: {
        customer: { include: { person: true } },
        lessonPackage: { include: { lessons: true } },
        sessions: {
          include: {
            attendance: true,
            instructor: { include: { person: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findPayments(appId, from, to) {
    return prisma.paymentObligation.findMany({
      where: { appId, createdAt: range(from, to) },
      include: { payments: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findRoomBookings(appId, from, to) {
    return prisma.cadenzaRoomBooking.findMany({
      where: { appId, scheduledStart: range(from, to) },
      include: {
        room: true,
        customer: { include: { person: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  },

  async findRentals(appId, from, to) {
    return prisma.cadenzaRental.findMany({
      where: { appId, scheduledStart: range(from, to) },
      include: {
        customer: { include: { person: true } },
        items: { include: { instrument: { include: { instrumentType: true } } } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  },

  async findSessions(appId, from, to) {
    return prisma.cadenzaLessonSession.findMany({
      where: { appId, scheduledStart: range(from, to) },
      include: {
        attendance: true,
        enrollment: {
          include: {
            customer: { include: { person: true } },
            lessonPackage: { include: { lessons: true } },
          },
        },
        instructor: { include: { person: true } },
        room: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });
  },
};

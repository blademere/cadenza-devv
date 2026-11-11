import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const range = (from, to) => ({ gte: from, lt: to });

export const reportsRepository = {
  async findEnrollments(appId, from, to) {
    return prisma.cadenzaEnrollment.findMany({
      where: { appId, createdAt: range(from, to) },
      include: {
        customer: { include: { person: true } },
        lessonPackage: {
          include: {
            lessons: true,
            courseMappings: { include: { course: { select: { name: true } } } },
          },
        },
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
      where: {
        appId,
        payments: { some: { createdAt: range(from, to) } },
      },
      include: { payments: { where: { createdAt: range(from, to) }, orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findCashierPayments(appId, from, to) {
    return prisma.cadenzaCashierPayment.findMany({
      where: {
        appId,
        createdAt: range(from, to),
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findRoomBookings(appId, from, to) {
    const bookings = await prisma.cadenzaRoomBooking.findMany({
      where: { appId, scheduledStart: range(from, to) },
      include: {
        room: true,
        customer: { include: { person: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    const resourceIds = [...new Set(bookings.map((booking) => booking.room?.resourceId).filter(Boolean))];
    const resources = resourceIds.length
      ? await prisma.resource.findMany({
        where: { appId, id: { in: resourceIds } },
        select: { id: true, name: true },
      })
      : [];
    const resourceNames = new Map(resources.map((resource) => [resource.id, resource.name]));

    return bookings.map((booking) => ({
      ...booking,
      room: booking.room
        ? { ...booking.room, resource: { name: resourceNames.get(booking.room.resourceId) || null } }
        : booking.room,
    }));
  },

  async findRentals(appId, from, to) {
    return prisma.cadenzaRental.findMany({
      where: { appId, scheduledStart: range(from, to) },
      include: {
        customer: { include: { person: true } },
        items: { include: { instrument: { include: { instrumentType: true, itemCategory: true } } } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  },

  async findInstruments(appId) {
    const instruments = await prisma.cadenzaInstrument.findMany({
      where: { appId },
      include: { instrumentType: true, itemCategory: true },
      orderBy: { resourceId: 'asc' },
    });
    const resources = await prisma.resource.findMany({
      where: { appId, id: { in: instruments.map((instrument) => instrument.resourceId).filter(Boolean) } },
      select: { id: true, name: true },
    });
    const names = new Map(resources.map((resource) => [resource.id, resource.name]));
    return instruments.map((instrument) => ({ ...instrument, name: names.get(instrument.resourceId) || instrument.instrumentType?.name || 'Unnamed item' }));
  },

  async findSessions(appId, from, to) {
    return prisma.cadenzaLessonSession.findMany({
      where: { appId, scheduledStart: range(from, to) },
      include: {
        attendance: true,
        enrollment: {
          include: {
            customer: { include: { person: true } },
            lessonPackage: {
              include: {
                lessons: true,
                courseMappings: { include: { course: { select: { name: true } } } },
              },
            },
          },
        },
        instructor: { include: { person: true } },
        room: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });
  },
};

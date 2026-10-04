import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const findRoomById = (roomId, appId, db = prisma) =>
  db.cadenzaRoom.findFirst({
    where: {
      id: roomId,
      appId,
    },
  });

const findCustomerById = (customerId, appId, db = prisma) =>
  db.cadenzaCustomer.findFirst({
    where: {
      id: customerId,
      appId,
    },
  });

const findOverlappingBookings = (
  { appId, roomId, scheduledStart, scheduledEnd, excludeId },
  db = prisma,
) =>
  db.cadenzaRoomBooking.findMany({
    where: {
      appId,
      roomId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: {
        not: 'CANCELLED',
      },
      scheduledStart: {
        lt: scheduledEnd,
      },
      scheduledEnd: {
        gt: scheduledStart,
      },
    },
    orderBy: {
      scheduledStart: 'asc',
    },
  });

const findOverlappingSessions = (
  { appId, roomId, scheduledStart, scheduledEnd },
  db = prisma,
) =>
  db.cadenzaLessonSession.findMany({
    where: {
      appId,
      roomId,
      status: {
        not: 'CANCELLED',
      },
      scheduledStart: {
        lt: scheduledEnd,
      },
      scheduledEnd: {
        gt: scheduledStart,
      },
    },
    orderBy: {
      scheduledStart: 'asc',
    },
  });

const create = (data, db = prisma) =>
  db.cadenzaRoomBooking.create({
    data,
    include: {
      room: true,
      customer: {
        include: {
          person: true,
        },
      },
    },
  });

const listByCustomer = (customerId, appId, db = prisma) =>
  db.cadenzaRoomBooking.findMany({
    where: {
      customerId,
      appId,
    },
    include: {
      room: true,
    },
    orderBy: {
      scheduledStart: 'desc',
    },
  });

const findById = (id, customerId, appId, db = prisma) =>
  db.cadenzaRoomBooking.findFirst({
    where: {
      id,
      customerId,
      appId,
    },
    include: {
      room: true,
    },
  });

const cancel = (id, customerId, appId, data, db = prisma) =>
  db.cadenzaRoomBooking.updateMany({
    where: {
      id,
      customerId,
      appId,
      status: {
        not: 'CANCELLED',
      },
    },
    data,
  });

const listAvailableRooms = async (
  { appId, scheduledStart, scheduledEnd },
  db = prisma,
) => {
  const rooms = await db.cadenzaRoom.findMany({
    where: {
      appId,
      status: 'AVAILABLE',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const bookings = await db.cadenzaRoomBooking.findMany({
    where: {
      appId,
      status: {
        not: 'CANCELLED',
      },
      scheduledStart: {
        lt: scheduledEnd,
      },
      scheduledEnd: {
        gt: scheduledStart,
      },
    },
    select: {
      roomId: true,
    },
  });

  const sessions = await db.cadenzaLessonSession.findMany({
    where: {
      appId,
      roomId: {
        not: null,
      },
      status: {
        not: 'CANCELLED',
      },
      scheduledStart: {
        lt: scheduledEnd,
      },
      scheduledEnd: {
        gt: scheduledStart,
      },
    },
    select: {
      roomId: true,
    },
  });

  const unavailableRoomIds = new Set([
    ...bookings.map((booking) => booking.roomId),
    ...sessions.map((session) => session.roomId),
  ]);

  return rooms.filter(
    (room) => !unavailableRoomIds.has(room.id),
  );
};

export {
  findRoomById,
  findCustomerById,
  findOverlappingBookings,
  findOverlappingSessions,
  create,
  listByCustomer,
  findById,
  cancel,
  listAvailableRooms,
};
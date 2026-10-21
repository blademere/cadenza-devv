import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const hydrateRoom = async (room, db = prisma) => {
  if (!room) return room;

  const resource = await db.resource.findFirst({
    where: { id: room.resourceId, appId: room.appId },
  });

  return { ...room, resource };
};

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
        notIn: ['CANCELLED', 'COMPLETED'],
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

const listAll = (appId, db = prisma) =>
  db.cadenzaRoomBooking.findMany({
    where: { appId },
    include: {
      room: true,
      customer: {
        include: { person: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

const updateStaffDecision = async (id, appId, data, db = prisma) => {
  const result = await db.cadenzaRoomBooking.updateMany({
    where: {
      id,
      appId,
      status: {
        in: [
          'FOR_APPROVAL',
          'PENDING',
          'PENDING_PAYMENT',
          'PENDING_CONFIRMATION',
          'PARTIALLY_PAID',
        ],
      },
    },
    data,
  });

  if (!result.count) return null;

  return db.cadenzaRoomBooking.findFirst({
    where: { id, appId },
    include: {
      room: true,
      customer: { include: { person: true } },
    },
  });
};

const updateCheckIn = (id, appId, data, db = prisma) =>
  db.cadenzaRoomBooking.updateMany({
    where: { id, appId, status: 'APPROVED' },
    data,
  });

const updateCheckOut = (id, appId, data, db = prisma) =>
  db.cadenzaRoomBooking.updateMany({
    where: { id, appId, status: 'CHECKED_IN' },
    data,
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
      customer: {
        include: {
          person: true,
        },
      },
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
      roomType: {
        notIn: ['LESSON_ROOM', 'LESSON'],
      },
      rentalRate: {
        gt: 0,
      },
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
        notIn: ['CANCELLED', 'COMPLETED'],
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

  return Promise.all(
    rooms
      .filter((room) => !unavailableRoomIds.has(room.id))
      .map((room) => hydrateRoom(room, db)),
  );
};

export {
  findRoomById,
  findCustomerById,
  findOverlappingBookings,
  findOverlappingSessions,
  create,
  listByCustomer,
  listAll,
  updateStaffDecision,
  updateCheckIn,
  updateCheckOut,
  findById,
  cancel,
  listAvailableRooms,
};

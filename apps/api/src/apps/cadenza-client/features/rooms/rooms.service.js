import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';
import * as repository from './rooms.repository.js';

const ROOM_STATUSES = new Set([
  'AVAILABLE',
  'UNAVAILABLE',
  'MAINTENANCE',
  'RETIRED',
]);

const normalize = ({
  roomType,
  capacity,
  rentalRate,
  rentalDurationHours,
  status,
}) => {
  if (!roomType?.trim()) {
    throw new BadRequestError('roomType is required.');
  }

  const normalizedCapacity = Number(capacity ?? 1);

  if (!Number.isInteger(normalizedCapacity) || normalizedCapacity <= 0) {
    throw new BadRequestError('capacity must be greater than zero.');
  }

  let normalizedRate;

  if (rentalRate !== undefined && rentalRate !== null) {
    normalizedRate = Number(rentalRate);

    if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) {
      throw new BadRequestError('rentalRate must be greater than zero.');
    }
  }

  const normalizedDuration = Number(
    rentalDurationHours ?? 2,
  );

  if (
    !Number.isInteger(normalizedDuration) ||
    normalizedDuration <= 0
  ) {
    throw new BadRequestError(
      'rentalDurationHours must be a whole number greater than zero.',
    );
  }

  if (status !== undefined && !ROOM_STATUSES.has(status)) {
    throw new BadRequestError('status is invalid.');
  }

  return {
    roomType: roomType.trim(),
    capacity: normalizedCapacity,
    rentalRate: normalizedRate ?? null,
    rentalDurationHours: normalizedDuration,
    ...(status === undefined ? {} : { status }),
  };
};

const create = async ({
  appId,
  roomType,
  roomName,
  capacity,
  rentalRate,
  rentalDurationHours,
  status,
  courseIds = [],
}) => {
  const input = normalize({
    roomType,
    roomName,
    capacity,
    rentalRate,
    rentalDurationHours,
    status,
  });

  try {
    return await repository.withTransaction(async (tx) => {
      const resource = await repository.createResource(
        {
          appId,
          key: `cadenza-room-${crypto.randomUUID()}`,
          name: roomName?.trim() || input.roomType,
          type: 'CADENZA_ROOM',
          status: 'ACTIVE',
        },
        tx,
      );

      const room = await repository.create(
        {
          appId,
          resourceId: resource.id,
          ...input,
        },
        tx,
      );

      await saveCourses(appId, room.id, courseIds, tx);

      return repository.findById(room.id, appId, tx);
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ConflictError('Room resource is already registered.');
    }

    throw error;
  }
};

const list = ({ appId }) => repository.list(appId);

const get = async ({ appId, id }) => {
  const room = await repository.findById(id, appId);

  if (!room) {
    throw new NotFoundError('Room not found.');
  }

  return room;
};

const update = async ({ appId, id, ...data }) => {
  const current = await repository.findById(id, appId);

  if (!current) {
    throw new NotFoundError('Room not found.');
  }

  const normalized = normalize({
    roomType: data.roomType ?? current.roomType,
    capacity: data.capacity ?? current.capacity ?? 1,
    rentalRate: data.rentalRate ?? current.rentalRate,
    rentalDurationHours:
      data.rentalDurationHours ??
      current.rentalDurationHours,
    status: data.status ?? current.status,
  });

  const result = await repository.withTransaction(async (tx) => {
    const updateResult = await repository.update(id, appId, normalized, tx);

    if (data.roomName !== undefined) {
      await repository.updateResource(
        current.resourceId,
        appId,
        { name: data.roomName.trim() },
        tx,
      );
    }

    if (data.courseIds !== undefined) {
      await saveCourses(appId, id, data.courseIds, tx);
    }

    return updateResult;
  });

  if (result.count !== 1) {
    throw new ConflictError('Room was modified or no longer exists.');
  }

  return repository.findById(id, appId);
};

const saveCourses = async (appId, roomId, courseIds, db) => {
  const uniqueCourseIds = [...new Set(courseIds)];
  const courses = await repository.findCourses(appId, uniqueCourseIds, db);

  if (courses.length !== uniqueCourseIds.length) {
    throw new BadRequestError('One or more selected courses do not exist.');
  }

  await repository.deleteRoomCourses(roomId, db);

  if (uniqueCourseIds.length > 0) {
    await repository.createRoomCourses(
      uniqueCourseIds.map((courseId) => ({ appId, roomId, courseId })),
      db,
    );
  }
};

export { create, list, get, update };

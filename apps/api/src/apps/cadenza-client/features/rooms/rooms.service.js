import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';
import { requireAppId } from '../../../../platform/applications/application-scope.js';
import * as repository from './rooms.repository.js';

const ROOM_STATUSES = new Set([
  'AVAILABLE',
  'UNAVAILABLE',
  'MAINTENANCE',
  'RETIRED',
]);

const normalize = ({ roomType, capacity, rentalRate, status }) => {
  if (!roomType?.trim()) {
    throw new BadRequestError('roomType is required.');
  }

  const normalizedCapacity = Number(capacity);

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

  if (status !== undefined && !ROOM_STATUSES.has(status)) {
    throw new BadRequestError('status is invalid.');
  }

  return {
    roomType: roomType.trim(),
    capacity: normalizedCapacity,
    rentalRate: normalizedRate ?? null,
    ...(status === undefined ? {} : { status }),
  };
};

const create = async ({ appId, roomType, capacity, rentalRate, status }) => {
  const owner = requireAppId(appId);

  const input = normalize({
    roomType,
    capacity,
    rentalRate,
    status,
  });

  try {
    return await repository.withTransaction(async (tx) => {
      const resource = await repository.createResource(
        {
          appId: owner,
          key: `cadenza-room-${crypto.randomUUID()}`,
          name: input.roomType,
          type: 'CADENZA_ROOM',
          status: 'ACTIVE',
        },
        tx,
      );

      return repository.create(
        {
          appId: owner,
          resourceId: resource.id,
          ...input,
        },
        tx,
      );
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ConflictError('Room resource is already registered.');
    }

    throw error;
  }
};

const list = ({ appId }) => repository.list(requireAppId(appId));

const get = async ({ appId, id }) => {
  const room = await repository.findById(id, requireAppId(appId));

  if (!room) {
    throw new NotFoundError('Room not found.');
  }

  return room;
};

const update = async ({ appId, id, ...data }) => {
  const owner = requireAppId(appId);

  const current = await repository.findById(id, owner);

  if (!current) {
    throw new NotFoundError('Room not found.');
  }

  const normalized = normalize({
    roomType: data.roomType ?? current.roomType,
    capacity: data.capacity ?? current.capacity,
    rentalRate: data.rentalRate ?? current.rentalRate,
    status: data.status ?? current.status,
  });

  const result = await repository.update(id, owner, normalized);

  if (result.count !== 1) {
    throw new ConflictError('Room was modified or no longer exists.');
  }

  return repository.findById(id, owner);
};

export { create, list, get, update };

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { enrollmentPackagesRepository } from './enrollment-packages.repository.js';

const PACKAGE_STATUSES = ['ACTIVE', 'INACTIVE'];

const validatePackageData = ({
  name,
  price,
  numberOfSessions,
  sessionDurationMinutes,
  sessionsPerWeek,
  status,
}) => {
  if (!name?.trim()) {
    throw new BadRequestError(
      'Package name is required.',
    );
  }

  const normalizedPrice = Number(price);

  if (
    !Number.isFinite(normalizedPrice) ||
    normalizedPrice <= 0
  ) {
    throw new BadRequestError(
      'Package price must be greater than zero.',
    );
  }

  const normalizedSessions = Number(
    numberOfSessions,
  );

  if (
    !Number.isInteger(normalizedSessions) ||
    normalizedSessions <= 0
  ) {
    throw new BadRequestError(
      'Number of sessions must be greater than zero.',
    );
  }

  const normalizedDuration = Number(
    sessionDurationMinutes,
  );

  if (
    !Number.isInteger(normalizedDuration) ||
    normalizedDuration <= 0
  ) {
    throw new BadRequestError(
      'Session duration must be greater than zero.',
    );
  }

  const normalizedFrequency = Number(
    sessionsPerWeek,
  );

  if (
    !Number.isInteger(normalizedFrequency) ||
    normalizedFrequency <= 0
  ) {
    throw new BadRequestError(
      'Sessions per week must be greater than zero.',
    );
  }

  if (
    status !== undefined &&
    !PACKAGE_STATUSES.includes(status)
  ) {
    throw new BadRequestError(
      'Invalid package status.',
    );
  }

  return {
    name: name.trim(),
    price: normalizedPrice,
    numberOfSessions: normalizedSessions,
    sessionDurationMinutes: normalizedDuration,
    sessionsPerWeek: normalizedFrequency,
    ...(status !== undefined
      ? { status }
      : {}),
  };
};

export const enrollmentPackagesService = {
  async getEnrollmentPackages(
    appId,
    filters = {},
  ) {
    return enrollmentPackagesRepository.findAll(
      appId,
      filters,
    );
  },

  async getEnrollmentPackageById(
    appId,
    id,
  ) {
    const packageItem =
      await enrollmentPackagesRepository.findById(
        appId,
        id,
      );

    if (!packageItem) {
      throw new NotFoundError(
        'Enrollment package not found.',
      );
    }

    return packageItem;
  },

  async createEnrollmentPackage(
    appId,
    data,
  ) {
    const normalized =
      validatePackageData({
        name: data.name,
        price: data.price,
        numberOfSessions:
          data.numberOfSessions,
        sessionDurationMinutes:
          data.sessionDurationMinutes,
        sessionsPerWeek:
          data.sessionsPerWeek,
        status: data.status,
      });

    const existing =
      await enrollmentPackagesRepository.findByName(
        appId,
        normalized.name,
      );

    if (existing) {
      throw new ConflictError(
        `An enrollment package named "${normalized.name}" already exists.`,
      );
    }

    return enrollmentPackagesRepository.create({
      appId,
      name: normalized.name,
      price: normalized.price,
      numberOfSessions:
        normalized.numberOfSessions,
      sessionDurationMinutes:
        normalized.sessionDurationMinutes,
      sessionsPerWeek:
        normalized.sessionsPerWeek,
      status:
        normalized.status || 'ACTIVE',
      metadata: data.metadata || null,
    });
  },

  async updateEnrollmentPackage(
    appId,
    id,
    data,
  ) {
    const current =
      await enrollmentPackagesRepository.findById(
        appId,
        id,
      );

    if (!current) {
      throw new NotFoundError(
        'Enrollment package not found.',
      );
    }

    const normalized =
      validatePackageData({
        name:
          data.name ??
          current.name,
        price:
          data.price ??
          current.price,
        numberOfSessions:
          data.numberOfSessions ??
          current.numberOfSessions,
        sessionDurationMinutes:
          data.sessionDurationMinutes ??
          current.sessionDurationMinutes,
        sessionsPerWeek:
          data.sessionsPerWeek ??
          current.sessionsPerWeek,
        status:
          data.status ??
          current.status,
      });

    const nameChanged =
      normalized.name !== current.name;

    if (nameChanged) {
      const existing =
        await enrollmentPackagesRepository.findByName(
          appId,
          normalized.name,
          id,
        );

      if (existing) {
        throw new ConflictError(
          `An enrollment package named "${normalized.name}" already exists.`,
        );
      }
    }

    const updated =
      await enrollmentPackagesRepository.update(
        appId,
        id,
        {
          name: normalized.name,
          price: normalized.price,
          numberOfSessions:
            normalized.numberOfSessions,
          sessionDurationMinutes:
            normalized.sessionDurationMinutes,
          sessionsPerWeek:
            normalized.sessionsPerWeek,
          status: normalized.status,
          metadata:
            data.metadata !== undefined
              ? data.metadata
              : current.metadata,
        },
      );

    if (!updated) {
      throw new NotFoundError(
        'Enrollment package not found.',
      );
    }

    return updated;
  },

  async deactivateEnrollmentPackage(
    appId,
    id,
  ) {
    return this.updateEnrollmentPackage(
      appId,
      id,
      {
        status: 'INACTIVE',
      },
    );
  },
};
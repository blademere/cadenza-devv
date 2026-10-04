import bcrypt from 'bcrypt';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { staffRepository } from './staff.repository.js';

const prisma = getPrismaClient();

const STAFF_TYPES = ['ADMIN', 'FRONT_DESK'];
const STAFF_STATUS = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

export const staffService = {
  async createStaffAccount(appId, data) {
    const email = data.email?.trim().toLowerCase();
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    const password = data.password;
    const staffType = data.staffType;

    if (!email || !firstName || !lastName || !password || !staffType) {
      throw new BadRequestError(
        'firstName, lastName, email, password, and staffType are required.',
      );
    }

    if (!STAFF_TYPES.includes(staffType)) {
      throw new BadRequestError(
        'Invalid staff type. Allowed values are ADMIN or FRONT_DESK.',
      );
    }

    if (password.length < 8 || password.length > 72) {
      throw new BadRequestError(
        'Password must be between 8 and 72 characters.',
      );
    }

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            isActive: true,
          },
        });

        const person = await tx.person.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            email,
            phone: data.phone?.trim() || null,
          },
        });

        return staffRepository.create(
          {
            appId,
            personId: person.id,
            staffType,
            status: data.status || 'ACTIVE',
            metadata: data.metadata || null,
          },
          tx,
        );
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictError('An account or staff record already exists.');
      }

      throw error;
    }
  },

  async getStaff(appId, filters) {
    return staffRepository.findAll(appId, filters);
  },

  async getStaffById(appId, staffId) {
    const staff = await staffRepository.findById(appId, staffId);

    if (!staff) {
      throw new NotFoundError('Staff member not found.');
    }

    return staff;
  },

  async getMyStaffProfile(appId, personId) {
    const staff = await staffRepository.findByPersonId(appId, personId);

    if (!staff) {
      throw new NotFoundError('Staff member not found.');
    }

    return staff;
  },

  async getMyStaffProfileByUserId(appId, userId) {
    const staff = await staffRepository.findByUserId(appId, userId);

    if (!staff) {
      throw new NotFoundError('Staff member not found.');
    }

    return staff;
  },

  async createStaff(appId, data) {
    if (!data.personId) {
      throw new BadRequestError('Person ID is required.');
    }

    if (!data.staffType) {
      throw new BadRequestError('Staff type is required.');
    }

    if (!STAFF_TYPES.includes(data.staffType)) {
      throw new BadRequestError(
        'Invalid staff type. Allowed values are ADMIN or FRONT_DESK.',
      );
    }

    if (data.status && !STAFF_STATUS.includes(data.status)) {
      throw new BadRequestError('Invalid staff status.');
    }

    const existingStaff = await staffRepository.findByPersonId(
      appId,
      data.personId,
    );

    if (existingStaff) {
      throw new ConflictError('This person is already registered as staff.');
    }

    return staffRepository.create({
      appId,
      personId: data.personId,
      staffType: data.staffType,
      status: data.status || 'ACTIVE',
      metadata: data.metadata || null,
    });
  },

  async updateStaff(appId, staffId, data) {
    const staff = await staffRepository.findById(appId, staffId);

    if (!staff) {
      throw new NotFoundError('Staff member not found.');
    }

    if (data.staffType && !STAFF_TYPES.includes(data.staffType)) {
      throw new BadRequestError(
        'Invalid staff type. Allowed values are ADMIN or FRONT_DESK.',
      );
    }

    if (data.status && !STAFF_STATUS.includes(data.status)) {
      throw new BadRequestError('Invalid staff status.');
    }

    const updateData = {};

    if (data.staffType !== undefined) {
      updateData.staffType = data.staffType;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    return staffRepository.update(appId, staffId, updateData);
  },

  async deactivateStaff(appId, staffId) {
    return this.updateStaff(appId, staffId, {
      status: 'INACTIVE',
    });
  },
};

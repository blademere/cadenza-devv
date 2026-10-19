import { BadRequestError } from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const createWalkInCustomer = async ({ appId, firstName, lastName, phone, email }) => {
  const normalizedFirstName = firstName?.trim();
  const normalizedLastName = lastName?.trim();
  const normalizedPhone = phone?.trim();
  const normalizedEmail = email?.trim().toLowerCase() || null;

  if (!normalizedFirstName || !normalizedLastName || !normalizedPhone) {
    throw new BadRequestError('Walk-in customer first name, last name, and phone are required.');
  }

  return prisma.$transaction(async (tx) => {
    const person = await tx.person.create({
      data: {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: normalizedPhone,
        email: normalizedEmail,
        metadata: { walkIn: true },
      },
    });

    return tx.cadenzaCustomer.create({
      data: {
        appId,
        personId: person.id,
        status: 'ACTIVE',
        metadata: { walkIn: true, createdAt: new Date().toISOString() },
      },
      include: { person: true },
    });
  });
};

import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { ForbiddenError } from '../../../../common/errors/appError.js';

const prisma = getPrismaClient();

export async function resolveEnrollmentCustomer(req, requestedId) {
  if (!requestedId || requestedId === req.cadenzaCustomer.id) return req.cadenzaCustomer.id;
  const child = await prisma.cadenzaCustomer.findFirst({ where: { id: String(requestedId), appId: req.cadenzaApp.id, guardianId: req.cadenzaCustomer.id, status: 'ACTIVE' }, select: { id: true } });
  if (!child) throw new ForbiddenError('You can only enroll yourself or a child under your guardian account.');
  return child.id;
}

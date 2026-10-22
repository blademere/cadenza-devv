import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();
const jsonSafe = (value) => JSON.parse(JSON.stringify(value, (_key, entry) => {
  if (entry?.constructor?.name === 'Decimal') return entry.toString();
  if (typeof entry === 'bigint') return entry.toString();
  return entry;
}));

export const recordCadenzaAudit = async ({ appId, personId, action, entityType, entityId, before, after }) =>
  prisma.cadenzaAuditLog.create({
    data: {
      appId,
      personId: personId || null,
      action,
      entityType,
      entityId: String(entityId),
      description: `${action} for ${entityType}`,
      metadata: jsonSafe({ before, after }),
    },
  });

export const listCadenzaAudit = async ({ appId, page = 1, limit = 20, q, entityType, category }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const entityTypes = category === 'ROOM_RENTALS' ? ['RoomRental'] : category === 'INSTRUMENT_RENTALS' ? ['InstrumentRental'] : category === 'ENROLLMENT_PACKAGES' ? ['EnrollmentPackage'] : entityType ? [entityType] : undefined;
  const where = {
    appId,
    ...(entityTypes ? { entityType: { in: entityTypes } } : {}),
    ...(q ? { OR: [
      { action: { contains: q, mode: 'insensitive' } },
      { entityType: { contains: q, mode: 'insensitive' } },
      { entityId: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.cadenzaAuditLog.findMany({ where, include: { person: { select: { firstName: true, lastName: true, email: true, cadenzaStaff: { where: { appId }, select: { staffType: true }, take: 1 } } } }, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
    prisma.cadenzaAuditLog.count({ where }),
  ]);
  const pages = Math.ceil(total / safeLimit);
  return { data: data.map((log) => ({ ...log, changedBy: log.person ? { name: [log.person.firstName, log.person.lastName].filter(Boolean).join(' '), email: log.person.email, role: ({ ADMIN: 'Admin', FRONT_DESK: 'Frontdesk', INSTRUCTOR: 'Instructor' }[log.person.cadenzaStaff?.[0]?.staffType] || 'Staff') } : { name: 'System', role: 'System' } })), pagination: { page: safePage, limit: safeLimit, total, pages, hasPreviousPage: safePage > 1, hasNextPage: safePage < pages } };
};

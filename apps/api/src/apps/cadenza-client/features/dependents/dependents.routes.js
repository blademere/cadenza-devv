import express from 'express';
import bcrypt from 'bcrypt';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { ConflictError, BadRequestError } from '../../../../common/errors/appError.js';
import { requireClient } from '../auth/authorization.js';

const router = express.Router();
const prisma = getPrismaClient();

const normalize = (value) => String(value || '').trim();
const CURRENT_ENROLLMENT_STATUSES = new Set([
  'ACTIVE',
  'AT_RISK',
  'APPROVED',
  'FOR_APPROVAL',
  'PENDING',
  'PENDING_PAYMENT',
  'PENDING_CONFIRMATION',
  'PARTIALLY_PAID',
]);

const serializeEnrollment = (item) => {
  const selectedCourseId = item.metadata?.courseId || null;
  const packageCourses = [
    ...(item.lessonPackage?.lessons || []),
    ...(item.lessonPackage?.courseMappings || []).map((mapping) => mapping.course).filter(Boolean),
  ].filter((course, index, courses) => courses.findIndex((candidate) => candidate.id === course.id) === index);
  const course = packageCourses.find((candidate) => candidate.id === selectedCourseId)
    || (packageCourses.length === 1 ? packageCourses[0] : null);

  return {
    id: item.id,
    packageName: item.packageNameAtEnrollment || item.lessonPackage?.name || null,
    status: item.status,
    enrolledAt: item.enrolledAt,
    createdAt: item.createdAt,
    course: course ? {
      id: course.id,
      name: course.name,
      description: course.description,
      level: course.level,
    } : null,
    schedule: (item.sessions || []).map((session) => ({
      id: session.id,
      scheduledStart: session.scheduledStart,
      scheduledEnd: session.scheduledEnd,
      status: session.status,
      instructor: session.instructor?.person
        ? [session.instructor.person.firstName, session.instructor.person.lastName].filter(Boolean).join(' ')
        : null,
      room: session.room?.roomType || session.room?.resourceId || null,
    })),
    billing: {
      totalAmount: Number(item.priceAtEnrollment || item.lessonPackage?.price || 0),
      paymentStatus: item.metadata?.paymentStatus || 'PENDING',
      paymentAmount: Number(item.metadata?.paymentAmount || item.metadata?.initialPaymentAmount || 0),
      remainingAmount: Math.max(
        Number(item.priceAtEnrollment || item.lessonPackage?.price || 0)
          - Number(item.metadata?.paymentAmount || item.metadata?.initialPaymentAmount || 0),
        0,
      ),
      paymentReference: item.metadata?.paymentReference || null,
    },
  };
};

const serialize = (customer) => ({
  id: customer.id,
  username: customer.person.user?.username || customer.person.user?.email || '',
  firstName: customer.person.firstName,
  middleName: customer.person.middleName,
  lastName: customer.person.lastName,
  age: customer.person.age,
  gender: customer.person.gender,
  status: customer.status,
  enrollments: customer.enrollments.map((item) => ({ id: item.id, packageName: item.packageNameAtEnrollment, status: item.status })),
  activeEnrollments: customer.enrollments.filter((item) => CURRENT_ENROLLMENT_STATUSES.has(item.status)).map(serializeEnrollment),
});
const enrollmentInclude = {
  lessonPackage: {
    include: {
      lessons: { select: { id: true, name: true, description: true, level: true } },
      courseMappings: { include: { course: { select: { id: true, name: true, description: true, level: true } } } },
    },
  },
  sessions: {
    include: {
      instructor: { include: { person: { select: { firstName: true, lastName: true } } } },
      room: { select: { resourceId: true, roomType: true } },
    },
    orderBy: { scheduledStart: 'asc' },
  },
};
const findOwned = (req, id) => prisma.cadenzaCustomer.findFirst({ where: { id, appId: req.cadenzaApp.id, guardianId: req.cadenzaCustomer.id }, include: { person: { include: { user: { select: { id: true, username: true, email: true } } } }, enrollments: { orderBy: { createdAt: 'desc' }, select: { id: true, packageNameAtEnrollment: true, status: true } } } });

router.use(requireClient);

router.get('/', async (req, res) => {
  const dependents = await prisma.cadenzaCustomer.findMany({
    where: { appId: req.cadenzaApp.id, guardianId: req.cadenzaCustomer.id },
    include: { person: { include: { user: { select: { username: true, email: true } } } }, enrollments: { orderBy: { createdAt: 'desc' }, include: enrollmentInclude } },
    orderBy: { person: { lastName: 'asc' } },
  });
  return res.json({ success: true, data: dependents.map(serialize) });
});

router.post('/', async (req, res) => {
  const username = normalize(req.body?.username).toLowerCase();
  const password = String(req.body?.password || '');
  const firstName = normalize(req.body?.firstName);
  const middleName = normalize(req.body?.middleName) || null;
  const lastName = normalize(req.body?.lastName);
  const age = Number(req.body?.age);
  const gender = normalize(req.body?.gender);
  if (!username || !password || !firstName || !lastName || !Number.isInteger(age) || !gender) throw new BadRequestError('Username, password, first name, last name, age, and gender are required.');
  if (age < 4 || age > 17) throw new BadRequestError('A dependent must be between 4 and 17 years old. Adults must create their own client account.');
  if (password.length < 8) throw new BadRequestError('Password must be at least 8 characters.');
  if (await prisma.user.findFirst({ where: { OR: [{ username }, { email: `${username}@child.cadenza.local` }] }, select: { id: true } })) throw new ConflictError('That username is already in use.');
  const application = req.cadenzaApp;
  const email = `${username}@child.cadenza.local`;
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, username, passwordHash } });
    const person = await tx.person.create({ data: { userId: user.id, firstName, middleName, lastName, age, gender } });
    return tx.cadenzaCustomer.create({ data: { appId: application.id, personId: person.id, guardianId: req.cadenzaCustomer.id }, include: { person: { include: { user: { select: { username: true, email: true } } } }, enrollments: true } });
  });
  return res.status(201).json({ success: true, message: 'Child account created successfully.', data: serialize(result) });
});

router.patch('/:id', async (req, res) => {
  const dependent = await findOwned(req, req.params.id);
  if (!dependent) return res.status(404).json({ success: false, message: 'Child account not found.' });
  const firstName = normalize(req.body?.firstName);
  const middleName = normalize(req.body?.middleName) || null;
  const lastName = normalize(req.body?.lastName);
  const age = Number(req.body?.age);
  const gender = normalize(req.body?.gender);
  const username = normalize(req.body?.username).toLowerCase();
  if (!firstName || !lastName || !username || !Number.isInteger(age) || age < 4 || age > 17 || !['MALE', 'FEMALE'].includes(gender)) throw new BadRequestError('Enter a valid child name, username, age from 4 to 17, and gender.');
  const conflict = await prisma.user.findFirst({ where: { username, NOT: { id: dependent.person.user.id } }, select: { id: true } });
  if (conflict) throw new ConflictError('That username is already in use.');
  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: dependent.person.user.id }, data: { username, email: `${username}@child.cadenza.local` } });
    await tx.person.update({ where: { id: dependent.person.id }, data: { firstName, middleName, lastName, age, gender } });
    return tx.cadenzaCustomer.findUnique({ where: { id: dependent.id }, include: { person: { include: { user: { select: { username: true, email: true } } } }, enrollments: { orderBy: { createdAt: 'desc' }, select: { id: true, packageNameAtEnrollment: true, status: true } } } });
  });
  return res.json({ success: true, data: serialize(updated) });
});

router.post('/:id/password', async (req, res) => {
  const dependent = await findOwned(req, req.params.id);
  if (!dependent) return res.status(404).json({ success: false, message: 'Child account not found.' });
  const password = String(req.body?.password || '');
  if (password.length < 8) throw new BadRequestError('Password must be at least 8 characters.');
  await prisma.user.update({ where: { id: dependent.person.user.id }, data: { passwordHash: await bcrypt.hash(password, 12), authVersion: { increment: 1 } } });
  return res.json({ success: true, message: 'Child password reset successfully.' });
});

export default router;

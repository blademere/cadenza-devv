import express from 'express';
import { z } from 'zod';

import cadenzaAuthenticate from '../cadenza-client/features/auth/authenticate.js';
import authRoutes from './features/auth/auth.routes.js';
import enrollmentRoutes from '../cadenza-client/features/enrollments/enrollment.routes.js';
import roomBookingsRoutes from '../cadenza-client/features/room-bookings/room-booking.routes.js';
import instrumentRentalsRoutes from '../cadenza-client/features/instrument-rentals/instrument-rentals.routes.js';
import requireActiveEnrollment from './middleware/require-active-enrollment.js';
import studentRoutes from './features/student/student.routes.js';
import instructorRoutes from './features/instructor/instructor.routes.js';
import { listNotifications } from '../../features/notifications/notification.service.js';
import { markNotificationRead } from '../../features/notifications/notification.service.js';
import { getPrismaClient } from '../../infrastructure/database/prisma.js';
import { idempotency } from '../../common/middleware/index.js';

const router = express.Router();
const prisma = getPrismaClient();

async function ensureUpcomingClassNotification(userId) {
  const now = new Date();
  const inTenMinutes = new Date(now.getTime() + 10 * 60 * 1000);
  const sessions = await prisma.cadenzaLessonSession.findMany({
    where: {
      scheduledStart: { gt: now, lte: inTenMinutes },
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
      enrollment: { status: { in: ['APPROVED', 'ACTIVE', 'AT_RISK'] } },
      OR: [
        { enrollment: { customer: { person: { userId: Number(userId) } } } },
        { instructor: { person: { userId: Number(userId) } } },
      ],
    },
    include: {
      enrollment: { include: { customer: { include: { person: true } } } },
      instructor: { include: { person: true } },
      room: { select: { resourceId: true } },
    },
  });
  const formatClassTime = (value) => new Date(value).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  for (const session of sessions) {
    const isInstructor = session.instructor?.person?.userId === Number(userId);
    const recipientRole = isInstructor ? 'instructor' : 'student';
    const idempotencyKey = `class-reminder-${session.id}-${recipientRole}`;
    const studentName = [session.enrollment?.customer?.person?.firstName, session.enrollment?.customer?.person?.lastName].filter(Boolean).join(' ') || 'Student';
    await prisma.notification.upsert({
      where: { idempotencyKey },
      create: {
        userId: Number(userId),
        type: 'UPCOMING_CLASS_REMINDER',
        title: 'Class starts in 10 minutes',
        message: isInstructor ? `Your class with ${studentName} starts at ${formatClassTime(session.scheduledStart)}.` : `Your ${session.enrollment?.packageNameAtEnrollment || 'lesson'} starts at ${formatClassTime(session.scheduledStart)}.`,
        data: { route: isInstructor ? '/instructor/schedule' : '/student/schedule', sessionId: session.id, scheduledStart: session.scheduledStart, room: session.room?.resourceId || null },
        idempotencyKey,
      },
      update: {},
    });
  }
}

router.use('/auth', authRoutes);

router.use(cadenzaAuthenticate);
router.use(requireActiveEnrollment);

router.get('/notifications', async (req, res, next) => {
  try {
    await ensureUpcomingClassNotification(req.user.id);
    const result = await listNotifications({ userId: req.user.id, page: 1, limit: 50 });
    return res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    return next(error);
  }
});
router.patch('/notifications/:id/read', idempotency({ scope: 'cadenza-mobile-notification-read', required: true }), async (req, res, next) => {
  try {
    const id = z.uuid().parse(req.params.id);
    const notification = await markNotificationRead({ userId: req.user.id, id });
    return res.json({ success: true, message: 'Notification marked as read.', data: notification });
  } catch (error) {
    return next(error);
  }
});

router.use('/student', studentRoutes);
router.use('/instructor', instructorRoutes);

router.use('/enrollments', enrollmentRoutes);
router.use('/room-bookings', roomBookingsRoutes);
router.use('/instrument-rentals', instrumentRentalsRoutes);

export default router;

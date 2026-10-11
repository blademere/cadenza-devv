import { BadRequestError } from '../../../../common/errors/appError.js';
import { reportsRepository } from './reports.repository.js';

const REPORT_TYPES = new Set([
  'enrollment-summary',
  'billing-payments',
  'instructor-assignments',
  'studio-bookings',
  'instrument-usage',
  'lesson-progress',
]);

const money = (amount) => `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unassigned';
const countBy = (items, getKey) => {
  const counts = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

const buildReport = async (appId, type, from, to) => {
  if (!REPORT_TYPES.has(type)) throw new BadRequestError('Unknown report type.');

  if (type === 'enrollment-summary') {
    const enrollments = await reportsRepository.findEnrollments(appId, from, to);
    const courses = enrollments.flatMap((item) => item.lessonPackage?.lessons || []);
    const topCourse = countBy(courses, (course) => course.name)[0];
    return {
      columns: ['Metric', 'Value'],
      rows: [
        ['Total enrollments', enrollments.length],
        ['Active enrollments', enrollments.filter((item) => !['CANCELLED', 'COMPLETED'].includes(item.status)).length],
        ['Completed enrollments', enrollments.filter((item) => item.status === 'COMPLETED').length],
        ['Most enrolled course', topCourse ? `${topCourse[0]} (${topCourse[1]})` : '—'],
      ],
    };
  }

  if (type === 'billing-payments') {
    const obligations = await reportsRepository.findPayments(appId, from, to);
    const payments = obligations.flatMap((obligation) => obligation.payments);
    const received = payments.filter((payment) => ['PAID', 'COMPLETED', 'SUCCESSFUL'].includes(payment.status));
    return {
      columns: ['Metric', 'Amount / Count'],
      rows: [
        ['Total billed', money(obligations.reduce((sum, item) => sum + Number(item.totalAmount), 0))],
        ['Payments received', money(received.reduce((sum, item) => sum + Number(item.amount), 0))],
        ['Outstanding balance', money(obligations.filter((item) => item.status !== 'PAID').reduce((sum, item) => sum + Number(item.totalAmount), 0))],
        ['Pending payments', payments.filter((payment) => payment.status === 'PENDING').length],
      ],
    };
  }

  if (type === 'instructor-assignments') {
    const sessions = await reportsRepository.findSessions(appId, from, to);
    const grouped = new Map();
    sessions.forEach((session) => {
      const instructor = personName(session.instructor?.person);
      const courseNames = (session.enrollment?.lessonPackage?.lessons || []).map((course) => course.name);
      const current = grouped.get(instructor) || { courses: new Set(), sessions: 0 };
      courseNames.forEach((name) => current.courses.add(name));
      current.sessions += 1;
      grouped.set(instructor, current);
    });
    return {
      columns: ['Instructor', 'Courses', 'Assigned sessions'],
      rows: [...grouped.entries()].map(([name, value]) => [name, [...value.courses].join(', ') || '—', value.sessions]),
    };
  }

  if (type === 'studio-bookings') {
    const bookings = await reportsRepository.findRoomBookings(appId, from, to);
    const topRoom = countBy(bookings, (booking) => booking.room?.resourceId)[0];
    return {
      columns: ['Metric', 'Value'],
      rows: [
        ['Total bookings', bookings.length],
        ['Approved bookings', bookings.filter((item) => item.status === 'APPROVED').length],
        ['Cancelled bookings', bookings.filter((item) => item.status === 'CANCELLED').length],
        ['Most used room', topRoom ? `${topRoom[0]} (${topRoom[1]})` : '—'],
      ],
    };
  }

  if (type === 'instrument-usage') {
    const rentals = await reportsRepository.findRentals(appId, from, to);
    const instruments = rentals.flatMap((rental) => rental.items);
    const topInstrument = countBy(instruments, (item) => item.instrument?.instrumentType?.name || item.instrument?.resourceId)[0];
    return {
      columns: ['Metric', 'Value'],
      rows: [
        ['Total rentals', rentals.length],
        ['Active rentals', rentals.filter((item) => !['CANCELLED', 'RETURNED', 'COMPLETED'].includes(item.status)).length],
        ['Returned instruments', rentals.filter((item) => item.returnedAt || item.status === 'RETURNED').length],
        ['Most used instrument', topInstrument ? `${topInstrument[0]} (${topInstrument[1]})` : '—'],
      ],
    };
  }

  const sessions = await reportsRepository.findSessions(appId, from, to);
  const attended = sessions.filter((session) => session.attendance?.status === 'PRESENT');
  return {
    columns: ['Metric', 'Value'],
    rows: [
      ['Lessons scheduled', sessions.length],
      ['Lessons completed', sessions.filter((session) => session.status === 'COMPLETED').length],
      ['Attendance rate', sessions.length ? `${Math.round((attended.length / sessions.length) * 100)}%` : '0%'],
      ['Students needing follow-up', new Set(sessions.filter((session) => ['ABSENT', 'NO_SHOW'].includes(session.attendance?.status)).map((session) => session.enrollment?.customerId)).size],
    ],
  };
};

export const reportsService = {
  async getReport(appId, { type, from, to }) {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    if (!from || !to || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end) {
      throw new BadRequestError('A valid report date range is required.');
    }
    return buildReport(appId, type, start, end);
  },
};

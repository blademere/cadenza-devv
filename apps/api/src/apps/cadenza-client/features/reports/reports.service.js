import { BadRequestError } from '../../../../common/errors/appError.js';
import { reportsRepository } from './reports.repository.js';

const REPORT_TYPES = new Set([
  'enrollment-summary',
  'billing-payments',
  'instructor-assignments',
  'studio-bookings',
  'instrument-usage',
  'lesson-progress',
  'dashboard-activity',
  'revenue-sales',
  'student-attendance',
  'course-performance',
  'rental-monitoring',
  'cancellation-summary',
]);

const money = (amount) => `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unassigned';
const dateTime = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—';
const customerName = (item) => personName(item?.customer?.person);
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


  if (type === 'revenue-sales') {
    const obligations = await reportsRepository.findPayments(appId, from, to);
    const payments = obligations.flatMap((o) => (o.payments || []).filter((p) => ['PAID', 'COMPLETED', 'SUCCESSFUL'].includes(p.status)).map((p) => ({ ...p, referenceType: o.referenceType })));
    const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const categories = new Map();
    for (const payment of payments) {
      const type = String(payment.referenceType || 'OTHER').replaceAll('_', ' ');
      categories.set(type, (categories.get(type) || 0) + Number(payment.amount || 0));
    }
    return { columns: ['Revenue source / payment', 'Amount', 'Status', 'Date', 'Reference'], rows: [['Total received', money(total), 'SUMMARY', '', ''], ...[...categories.entries()].sort((a,b) => b[1] - a[1]).map(([type, value]) => [type, money(value), 'SUMMARY', '', '']), ...payments.map((payment) => [payment.referenceType || 'OTHER', money(payment.amount), payment.status, dateTime(payment.paidAt || payment.createdAt), payment.referenceId || payment.id])] };
  }

  if (type === 'student-attendance') {
    const sessions = await reportsRepository.findSessions(appId, from, to);
    const counts = countBy(sessions, (session) => session.attendance?.status || 'NOT_RECORDED');
    const attended = sessions.filter((s) => s.attendance?.status === 'PRESENT').length;
    const marked = sessions.filter((s) => s.attendance?.status).length;
    return { columns: ['Attendance metric / student', 'Count / Rate', 'Date', 'Status', 'Instructor'], rows: [['Sessions scheduled', sessions.length, '', 'SUMMARY', ''], ['Recorded attendance', marked, '', 'SUMMARY', ''], ['Present', attended, '', 'SUMMARY', ''], ['Attendance rate (recorded)', marked ? `${Math.round(attended / marked * 100)}%` : 'N/A', '', 'SUMMARY', ''], ...counts.map(([status, count]) => [status.replaceAll('_',' '), count, '', 'SUMMARY', '']), ...sessions.map((session) => [customerName(session), session.attendance?.status || 'NOT_RECORDED', dateTime(session.scheduledStart), session.status, personName(session.instructor?.person)])] };
  }

  if (type === 'course-performance') {
    const enrollments = await reportsRepository.findEnrollments(appId, from, to);
    const courseCounts = countBy(enrollments.flatMap((item) => item.lessonPackage?.lessons || []), (course) => course.name);
    return { columns: ['Course / student', 'Enrollments / status', 'Enrollment date', 'Enrollment ID'], rows: [...courseCounts, ...enrollments.map((item) => [(item.lessonPackage?.lessons || []).map((course) => course.name).join(', ') || '—', item.status, dateTime(item.createdAt), item.id])] };
  }

  if (type === 'rental-monitoring') {
    const rentals = await reportsRepository.findRentals(appId, from, to);
    const now = new Date();
    return { columns: ['Rental / customer', 'Value / status', 'Start', 'End', 'Rental ID'], rows: [
      ['Total rentals', rentals.length],
      ['Active / pending', rentals.filter((r) => !['COMPLETED','CANCELLED','RETURNED'].includes(r.status)).length],
      ['Overdue (not completed)', rentals.filter((r) => r.scheduledEnd < now && !['COMPLETED','CANCELLED','RETURNED'].includes(r.status)).length],
      ['Completed / returned', rentals.filter((r) => ['COMPLETED','RETURNED'].includes(r.status) || r.returnedAt).length],
      ['Scheduled rental value', money(rentals.filter((r) => r.status !== 'CANCELLED').reduce((sum, r) => sum + Number(r.totalAmount || 0), 0)), '', 'SUMMARY', ''],
      ...rentals.map((rental) => [customerName(rental), `${money(rental.totalAmount)} / ${rental.status}`, dateTime(rental.scheduledStart), dateTime(rental.scheduledEnd), rental.id]),
    ] };
  }

  if (type === 'cancellation-summary') {
    const [enrollments, rooms, rentals] = await Promise.all([
      reportsRepository.findEnrollments(appId, from, to),
      reportsRepository.findRoomBookings(appId, from, to),
      reportsRepository.findRentals(appId, from, to),
    ]);
    return { columns: ['Service / customer', 'Cancelled / total', 'Date', 'Status', 'Record ID'], rows: [
      ['Enrollments', `${enrollments.filter((x) => x.status === 'CANCELLED').length} / ${enrollments.length}`],
      ['Room bookings', `${rooms.filter((x) => x.status === 'CANCELLED').length} / ${rooms.length}`],
      ['Instrument rentals', `${rentals.filter((x) => x.status === 'CANCELLED').length} / ${rentals.length}`],
      ...enrollments.map((item) => ['Enrollment / ' + customerName(item), item.status, dateTime(item.createdAt), item.status, item.id]),
      ...rooms.map((item) => ['Room booking', item.status, dateTime(item.scheduledStart), item.status, item.id]),
      ...rentals.map((item) => ['Instrument rental / ' + customerName(item), item.status, dateTime(item.scheduledStart), item.status, item.id]),
    ] };
  }

  if (type === 'enrollment-summary') {
    const enrollments = await reportsRepository.findEnrollments(appId, from, to);
    const courses = enrollments.flatMap((item) => item.lessonPackage?.lessons || []);
    const topCourse = countBy(courses, (course) => course.name)[0];
    return {
      columns: ['Metric / student', 'Value / status', 'Date', 'Enrollment ID'],
      rows: [
        ['Total enrollments', enrollments.length],
        ['Active enrollments', enrollments.filter((item) => !['CANCELLED', 'COMPLETED'].includes(item.status)).length],
        ['Completed enrollments', enrollments.filter((item) => item.status === 'COMPLETED').length],
        ['Most enrolled course', topCourse ? `${topCourse[0]} (${topCourse[1]})` : '—'],
        ...enrollments.map((item) => [customerName(item), item.status, dateTime(item.createdAt), item.id]),
      ],
    };
  }

  if (type === 'billing-payments') {
    const obligations = await reportsRepository.findPayments(appId, from, to);
    const payments = obligations.flatMap((obligation) => obligation.payments);
    const received = payments.filter((payment) => ['PAID', 'COMPLETED', 'SUCCESSFUL'].includes(payment.status));
    return {
      columns: ['Payment / obligation', 'Amount / status', 'Date', 'Reference'],
      rows: [
        ['Total billed', money(obligations.reduce((sum, item) => sum + Number(item.totalAmount), 0))],
        ['Payments received', money(received.reduce((sum, item) => sum + Number(item.amount), 0))],
        ['Outstanding balance', money(obligations.reduce((sum, item) => {
          const paid = (item.payments || []).filter((p) => ['PAID','COMPLETED','SUCCESSFUL'].includes(p.status)).reduce((n,p) => n + Number(p.amount || 0),0);
          return sum + Math.max(0, Number(item.totalAmount || 0) - paid);
        }, 0))],
        ['Pending payments', payments.filter((payment) => payment.status === 'PENDING').length],
        ...obligations.flatMap((obligation) => (obligation.payments || []).map((payment) => [obligation.referenceType || 'Payment', `${money(payment.amount)} / ${payment.status}`, dateTime(payment.paidAt || payment.createdAt), payment.referenceId || payment.id])),
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
      columns: ['Instructor', 'Courses', 'Assigned sessions', 'Session date', 'Status', 'Session ID'],
      rows: [...grouped.entries()].map(([name, value]) => [name, [...value.courses].join(', ') || '—', value.sessions, '', 'SUMMARY', '']),
        ...sessions.map((session) => [personName(session.instructor?.person), (session.enrollment?.lessonPackage?.lessons || []).map((course) => course.name).join(', ') || '—', 1, dateTime(session.scheduledStart), session.status, session.id]),
    };
  }

  if (type === 'studio-bookings') {
    const bookings = await reportsRepository.findRoomBookings(appId, from, to);
    const topRoom = countBy(bookings, (booking) => booking.room?.resource?.name || booking.roomNameAtBooking || booking.room?.resourceId)[0];
    return {
      columns: ['Room / customer', 'Status', 'Start', 'End', 'Booking ID'],
      rows: [
        ['Total bookings', bookings.length],
        ['Approved bookings', bookings.filter((item) => item.status === 'APPROVED').length],
        ['Cancelled bookings', bookings.filter((item) => item.status === 'CANCELLED').length],
        ...bookings.map((booking) => [booking.room?.resource?.name || booking.roomNameAtBooking || 'Room', `${customerName(booking)} / ${booking.status}`, dateTime(booking.scheduledStart), dateTime(booking.scheduledEnd), booking.id]),
        ['Most used room', topRoom ? `${topRoom[0]} (${topRoom[1]})` : '—'],
      ],
    };
  }

  if (type === 'instrument-usage') {
    const rentals = await reportsRepository.findRentals(appId, from, to);
    const instruments = rentals.flatMap((rental) => rental.items);
    const topInstrument = countBy(instruments, (item) => item.instrument?.instrumentType?.name || item.instrument?.resourceId)[0];
    return {
      columns: ['Instrument / customer', 'Status', 'Start', 'End', 'Rental ID'],
      rows: [
        ['Total rentals', rentals.length],
        ['Active rentals', rentals.filter((item) => !['CANCELLED', 'RETURNED', 'COMPLETED'].includes(item.status)).length],
        ['Returned instruments', rentals.filter((item) => item.returnedAt || item.status === 'RETURNED').length],
        ...rentals.flatMap((rental) => (rental.items || []).map((item) => [item.instrument?.instrumentType?.name || item.instrument?.resourceId || 'Instrument', `${customerName(rental)} / ${rental.status}`, dateTime(rental.scheduledStart), dateTime(rental.scheduledEnd), rental.id])),
        ['Most used instrument', topInstrument ? `${topInstrument[0]} (${topInstrument[1]})` : '—'],
      ],
    };
  }

  if (type === 'dashboard-activity') {
    const [enrollments, bookings, rentals, obligations] = await Promise.all([
      reportsRepository.findEnrollments(appId, from, to),
      reportsRepository.findRoomBookings(appId, from, to),
      reportsRepository.findRentals(appId, from, to),
      reportsRepository.findPayments(appId, from, to),
    ]);
    const payments = obligations.flatMap((obligation) =>
      obligation.payments.map((payment) => ({
        ...payment,
        referenceType: obligation.referenceType,
        referenceId: obligation.referenceId,
      })),
    );
    const successfulPayments = payments.filter((payment) =>
      ['PAID', 'COMPLETED', 'SUCCESSFUL'].includes(payment.status),
    );
    const outstandingBalance = obligations.reduce((sum, o) => {
      const paid = (o.payments || []).filter((p) => ['PAID','COMPLETED','SUCCESSFUL'].includes(p.status)).reduce((n,p) => n + Number(p.amount || 0),0);
      return sum + Math.max(0, Number(o.totalAmount || 0) - paid);
    },0);
    const activeEnrollments = enrollments.filter((e) => !['CANCELLED','COMPLETED'].includes(e.status)).length;
    const activeRentals = rentals.filter((r) => !['CANCELLED','COMPLETED','RETURNED'].includes(r.status)).length;
    const days = new Map();
    const addDay = (value) => {
      const date = new Date(value).toISOString().slice(0, 10);
      if (!days.has(date)) {
        days.set(date, {
          date,
          bookings: 0,
          rentals: 0,
          enrollments: 0,
          successfulPayments: 0,
          transactions: 0,
        });
      }
      return days.get(date);
    };

    enrollments.forEach((item) => { addDay(item.createdAt).enrollments += 1; });
    bookings.forEach((item) => { addDay(item.createdAt).bookings += 1; });
    rentals.forEach((item) => { addDay(item.createdAt).rentals += 1; });
    successfulPayments.forEach((payment) => {
      const day = addDay(payment.paidAt || payment.createdAt);
      day.successfulPayments += Number(payment.amount || 0);
      day.transactions += 1;
    });

    return {
      series: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      summary: {
        bookings: bookings.length,
        rentals: rentals.length,
        enrollments: enrollments.length,
        activeEnrollments,
        activeRentals,
        outstandingBalance,
        successfulPaymentAmount: successfulPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        ),
        successfulTransactionCount: successfulPayments.length,
      },
      recentPayments: [...successfulPayments]
        .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
        .slice(0, 5)
        .map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount || 0),
          type: payment.referenceType || 'Payment',
          referenceId: payment.referenceId,
          paidAt: payment.paidAt || payment.createdAt,
        })),
    };
  }

  const sessions = await reportsRepository.findSessions(appId, from, to);
  const attended = sessions.filter((session) => session.attendance?.status === 'PRESENT');
  return {
    columns: ['Student', 'Lesson status', 'Attendance', 'Date', 'Session ID'],
    rows: [
      ['Lessons scheduled', sessions.length],
      ['Lessons completed', sessions.filter((session) => session.status === 'COMPLETED').length],
      ['Attendance rate', sessions.length ? `${Math.round((attended.length / sessions.length) * 100)}%` : '0%'],
      ['Students needing follow-up', new Set(sessions.filter((session) => ['ABSENT', 'NO_SHOW'].includes(session.attendance?.status)).map((session) => session.enrollment?.customerId)).size],
      ...sessions.map((session) => [customerName(session.enrollment), session.status, session.attendance?.status || 'NOT_RECORDED', dateTime(session.scheduledStart), session.id]),
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

import { BadRequestError } from '../../../../common/errors/appError.js';
import { reportsRepository } from './reports.repository.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const REPORT_TYPES = new Set([
  'payment-sales', 'instrument-equipment', 'student-report', 'instructor-report',
  'enrollment-report', 'cancellation-report', 'outstanding-balance', 'refund-report',
  'attendance-report', 'room-utilization', 'rental-monitoring', 'student-progress',
  'dashboard-activity',
]);

const REPORT_ALIASES = {
  'payment-sales': 'revenue-sales',
  'instrument-equipment': 'instrument-usage',
  'student-report': 'enrollment-summary',
  'instructor-report': 'instructor-assignments',
  'enrollment-report': 'enrollment-summary',
  'cancellation-report': 'cancellation-summary',
  'outstanding-balance': 'billing-payments',
  'refund-report': 'billing-payments',
  'attendance-report': 'student-attendance',
  'room-utilization': 'studio-bookings',
  'student-progress': 'student-attendance',
};

const prisma = getPrismaClient();
const money = (amount) => `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unassigned';
const dateTime = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—';
const customerName = (item) => personName(item?.customer?.person);
const paymentReference = (payment) => {
  const method = String(payment?.method || payment?.provider || '').toUpperCase();
  return method === 'CASH'
    ? 'No reference (cash)'
    : payment?.reference || payment?.providerReference || payment?.referenceId || payment?.id || '—';
};
const paymentSuccessful = (status) => ['PAID', 'COMPLETED', 'SUCCESSFUL'].includes(String(status || '').toUpperCase());
const paymentPending = (status) => ['PENDING', 'PENDING_CONFIRMATION', 'PENDING_PROCEED', 'PARTIALLY_PAID', 'FOR_APPROVAL'].includes(String(status || '').toUpperCase());
const countBy = (items, getKey) => {
  const counts = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};
const packageCourses = (lessonPackage) => [
  ...(lessonPackage?.lessons || []),
  ...(lessonPackage?.courseMappings || []).map((mapping) => mapping.course).filter(Boolean),
];

const buildReport = async (appId, type, from, to) => {
  if (!REPORT_TYPES.has(type)) throw new BadRequestError('Unknown report type.');
  type = REPORT_ALIASES[type] || type;


  if (type === 'revenue-sales') {
    const [obligations, cashierPayments, enrollments, bookings, rentals, enrollmentRefunds, bookingRentalRefunds] = await Promise.all([
      reportsRepository.findPayments(appId, from, to),
      reportsRepository.findCashierPayments(appId, from, to),
      reportsRepository.findEnrollments(appId, from, to),
      reportsRepository.findRoomBookings(appId, from, to),
      reportsRepository.findRentals(appId, from, to),
      reportsRepository.findEnrollmentRefunds(appId, from, to),
      reportsRepository.findBookingRentalRefunds(appId, from, to),
    ]);
    const metadataPayment = (record, referenceType) => {
      const metadata = record.metadata || {};
      const amount = Number(metadata.initialPaymentAmount ?? metadata.paymentAmount ?? 0);
      if (!(amount > 0)) return null;
      return {
        amount,
        method: metadata.paymentMethod || 'QR',
        referenceType,
        sourceId: record.id,
        customer: customerName(record),
        reference: metadata.paymentReference || null,
        status: metadata.paymentStatus || 'PENDING_CONFIRMATION',
        createdAt: metadata.paymentSubmittedAt || record.createdAt || record.scheduledStart,
      };
    };
    const paymentKey = (referenceType, reference) => `${String(referenceType || '').toUpperCase()}:${String(reference || '').trim().toUpperCase()}`;
    const recordedReferences = new Set([
      ...obligations.flatMap((obligation) => (obligation.payments || []).map((payment) => paymentKey(obligation.referenceType, payment.providerReference || payment.referenceId))),
      ...cashierPayments.map((payment) => paymentKey(payment.transactionType, payment.reference)),
    ]);
    const metadataPayments = [
      ...enrollments.map((item) => metadataPayment(item, 'ENROLLMENT')),
      ...bookings.map((item) => metadataPayment(item, 'ROOM_BOOKING')),
      ...rentals.map((item) => metadataPayment(item, 'INSTRUMENT_RENTAL')),
    ].filter((payment) => payment && (!payment.reference || !recordedReferences.has(paymentKey(payment.referenceType, payment.reference))));
    const payments = [
      ...obligations.flatMap((obligation) => (obligation.payments || []).map((payment) => ({
        ...payment, referenceType: obligation.referenceType, sourceId: obligation.referenceId,
        reference: payment.providerReference || payment.referenceId || payment.id,
      }))),
      ...cashierPayments.map((payment) => ({
        ...payment, referenceType: payment.transactionType, sourceId: payment.sourceId,
        paidAt: payment.createdAt, status: 'SUCCESSFUL',
      })),
      ...metadataPayments,
    ];
    const normalizedType = (value) => String(value || '').toUpperCase().replace(/[ -]/g, '_');
    const sourceRecords = [
      ...enrollments.map((record) => ({ ...record, transactionType: 'ENROLLMENT' })),
      ...bookings.map((record) => ({ ...record, transactionType: 'ROOM_BOOKING' })),
      ...rentals.map((record) => ({ ...record, transactionType: 'INSTRUMENT_RENTAL' })),
    ];
    const sourceKey = (type, id) => `${normalizedType(type)}:${id}`;
    const sourceNames = new Map(sourceRecords.map((record) => [sourceKey(record.transactionType, record.id), customerName(record)]));
    const sourceIds = { ENROLLMENT: new Set(), ROOM_BOOKING: new Set(), INSTRUMENT_RENTAL: new Set() };
    for (const record of [...payments, ...enrollmentRefunds.map((refund) => ({ ...refund, referenceType: 'ENROLLMENT', sourceId: refund.enrollmentId })), ...bookingRentalRefunds.map((refund) => ({ ...refund, referenceType: refund.transactionType }))]) {
      const type = normalizedType(record.referenceType);
      if (sourceIds[type] && record.sourceId && !sourceNames.has(sourceKey(type, record.sourceId))) {
        sourceIds[type].add(record.sourceId);
      }
    }
    const [additionalEnrollments, additionalBookings, additionalRentals] = await Promise.all([
      sourceIds.ENROLLMENT.size ? prisma.cadenzaEnrollment.findMany({
        where: { appId, id: { in: [...sourceIds.ENROLLMENT] } },
        select: { id: true, customer: { select: { person: { select: { firstName: true, lastName: true } } } } },
      }) : [],
      sourceIds.ROOM_BOOKING.size ? prisma.cadenzaRoomBooking.findMany({
        where: { appId, id: { in: [...sourceIds.ROOM_BOOKING] } },
        select: { id: true, customer: { select: { person: { select: { firstName: true, lastName: true } } } } },
      }) : [],
      sourceIds.INSTRUMENT_RENTAL.size ? prisma.cadenzaRental.findMany({
        where: { appId, id: { in: [...sourceIds.INSTRUMENT_RENTAL] } },
        select: { id: true, customer: { select: { person: { select: { firstName: true, lastName: true } } } } },
      }) : [],
    ]);
    for (const [type, records] of [['ENROLLMENT', additionalEnrollments], ['ROOM_BOOKING', additionalBookings], ['INSTRUMENT_RENTAL', additionalRentals]]) {
      for (const record of records) sourceNames.set(sourceKey(type, record.id), customerName(record));
    }
    const paymentCustomer = (type, id) => sourceNames.get(sourceKey(type, id)) || 'Unknown customer';
    const rows = [
      ...payments.map((payment) => [
        String(payment.referenceType || 'OTHER').replaceAll('_', ' '),
        paymentCustomer(payment.referenceType, payment.sourceId),
        String(payment.method || payment.provider || 'ONLINE').replaceAll('_', '),
        money(payment.amount),
        String(payment.status || 'PENDING_CONFIRMATION').toUpperCase(),
        dateTime(payment.paidAt || payment.createdAt),
        paymentReference(payment),
      ]),
      ...enrollmentRefunds.map((refund) => ['ENROLLMENT', paymentCustomer('ENROLLMENT', refund.enrollmentId), refund.method, money(refund.amount), 'REFUNDED', dateTime(refund.createdAt), paymentReference(refund)]),
      ...bookingRentalRefunds.map((refund) => [String(refund.transactionType).replaceAll('_', ' '), paymentCustomer(refund.transactionType, refund.sourceId), refund.method, money(refund.amount), 'REFUNDED', dateTime(refund.createdAt), paymentReference(refund)]),
    ];
    const amountFor = (statuses) => payments.filter((payment) => statuses.includes(String(payment.status || '').toUpperCase()))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const refunded = [...enrollmentRefunds, ...bookingRentalRefunds].reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
    return {
      columns: ['Transaction type', 'Customer', 'Payment method', 'Amount', 'Status', 'Date', 'Reference'],
      summary: [
        { label: 'Total Collected', value: money(amountFor(['PAID', 'COMPLETED', 'SUCCESSFUL'])) },
        { label: 'Pending Confirmation', value: money(amountFor(['PENDING', 'PENDING_CONFIRMATION', 'PENDING_PROCEED', 'PARTIALLY_PAID', 'FOR_APPROVAL'])) },
        { label: 'Refunded', value: money(refunded) },
      ],
      rows,
    };
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
    return { columns: ['Course / student', 'Enrollments / status', 'Enrollment date'], rows: [...courseCounts, ...enrollments.map((item) => [(item.lessonPackage?.lessons || []).map((course) => course.name).join(', ') || '—', item.status, dateTime(item.createdAt)])] };
  }

  if (type === 'rental-monitoring') {
    const rentals = await reportsRepository.findRentals(appId, from, to);
    const now = new Date();
    return {
      columns: ['Rental / customer', 'Instrument', 'Value / status', 'Start', 'End'],
      summary: [
        { label: 'Total rentals', value: rentals.length },
        { label: 'Active / pending', value: rentals.filter((r) => !['COMPLETED', 'CANCELLED', 'RETURNED', 'REJECTED'].includes(r.status)).length },
        { label: 'Overdue (not completed)', value: rentals.filter((r) => r.scheduledEnd < now && !['COMPLETED', 'CANCELLED', 'RETURNED', 'REJECTED'].includes(r.status)).length },
        { label: 'Completed / returned', value: rentals.filter((r) => ['COMPLETED', 'RETURNED'].includes(r.status) || r.returnedAt).length },
        { label: 'Scheduled rental value', value: money(rentals.filter((r) => !['CANCELLED', 'REJECTED'].includes(r.status)).reduce((sum, r) => sum + Number(r.totalAmount || 0), 0)) },
      ],
      rows: rentals.map((rental) => [
        customerName(rental),
        [...new Set((rental.items || []).map((item) => item.instrument?.name || item.instrument?.instrumentType?.name || 'Unnamed instrument'))].join(', ') || 'Not specified',
        `${money(rental.totalAmount)} / ${rental.status}`,
        dateTime(rental.scheduledStart),
        dateTime(rental.scheduledEnd),
      ]),
    };
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
    const selectedCourseIds = [...new Set(enrollments.map((item) => item.metadata?.courseId || item.termsSnapshot?.courseId).filter(Boolean))];
    const selectedCourses = selectedCourseIds.length ? await prisma.cadenzaCourse.findMany({
      where: { appId, id: { in: selectedCourseIds } },
      select: { id: true, name: true },
    }) : [];
    const selectedCourseNames = new Map(selectedCourses.map((course) => [course.id, course.name]));
    const enrolledCourse = (enrollment) => {
      const selectedCourseId = enrollment.metadata?.courseId || enrollment.termsSnapshot?.courseId;
      const courses = packageCourses(enrollment.lessonPackage);
      if (selectedCourseId) {
        return selectedCourseNames.get(selectedCourseId)
          || courses.find((course) => course.id === selectedCourseId)?.name
          || enrollment.metadata?.courseName
          || enrollment.termsSnapshot?.courseName
          || 'Not specified';
      }
      const distinctCourses = [...new Set(courses.map((course) => course.name).filter(Boolean))];
      return distinctCourses.length === 1 ? distinctCourses[0] : 'Not specified';
    };
    const courses = enrollments.map(enrolledCourse).filter((name) => !['Not specified', 'Unknown course'].includes(name));
    const topCourse = countBy(courses, (name) => name)[0];
    return {
      columns: ['Student', 'Course', 'Status', 'Enrollment date'],
      summary: [
        { label: 'Total enrollments', value: enrollments.length },
        { label: 'Approved enrollments', value: enrollments.filter((item) => item.status === 'APPROVED').length },
        { label: 'Completed enrollments', value: enrollments.filter((item) => item.status === 'COMPLETED').length },
        { label: 'Most enrolled course', value: topCourse ? `${topCourse[0]} (${topCourse[1]})` : '—' },
      ],
      rows: enrollments.map((item) => [
        customerName(item),
        enrolledCourse(item),
        item.status,
        dateTime(item.createdAt),
      ]),
    };
  }

  if (type === 'billing-payments') {
    const [obligations, cashierPayments] = await Promise.all([
      reportsRepository.findPayments(appId, from, to),
      reportsRepository.findCashierPayments(appId, from, to),
    ]);
    const payments = obligations.flatMap((obligation) => obligation.payments.map((payment) => ({
      ...payment,
      transactionType: obligation.referenceType,
      sourceId: obligation.referenceId,
      billedAmount: obligation.totalAmount,
    })));
    const received = payments.filter((payment) => ['PAID', 'COMPLETED', 'SUCCESSFUL'].includes(payment.status));
    const cashierTotal = cashierPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const billedTotal = obligations.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const receivedTotal = received.reduce((sum, item) => sum + Number(item.amount || 0), 0) + cashierTotal;
    const cashierBySource = new Map();
    cashierPayments.forEach((payment) => {
      const key = `${payment.transactionType}:${payment.sourceId}`;
      cashierBySource.set(key, (cashierBySource.get(key) || 0) + Number(payment.amount || 0));
    });
    const obligationPaid = (obligation) => {
      const onlinePaid = (obligation.payments || [])
        .filter((p) => ['PAID','COMPLETED','SUCCESSFUL'].includes(p.status))
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      return onlinePaid + (cashierBySource.get(`${obligation.referenceType}:${obligation.referenceId}`) || 0);
    };
    const outstandingTotal = obligations.reduce((sum, item) => sum + Math.max(0, Number(item.totalAmount || 0) - obligationPaid(item)), 0);
    return {
      columns: ['Payment / transaction', 'Billed', 'Paid', 'Balance', 'Status', 'Method / reference', 'Date'],
      rows: [
        ['TOTAL BILLED', money(billedTotal), money(receivedTotal), money(Math.max(0, billedTotal - receivedTotal)), 'SUMMARY', '', ''],
        ['PAYMENTS RECEIVED', '', money(receivedTotal), '', 'SUMMARY', `${received.length + cashierPayments.length} transactions`, ''],
        ['OUTSTANDING BALANCE', '', '', money(outstandingTotal), 'SUMMARY', '', ''],
        ['PENDING PAYMENTS', '', '', '', 'SUMMARY', payments.filter((payment) => payment.status === 'PENDING').length, ''],
        ...obligations.map((obligation) => {
          const paid = obligationPaid(obligation);
          const latest = [...(obligation.payments || [])].sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))[0];
          return [obligation.referenceType || 'Payment', money(obligation.totalAmount), money(paid), money(Math.max(0, Number(obligation.totalAmount || 0) - paid)), obligation.status, latest ? `${latest.method || latest.provider || 'ONLINE'} / ${latest.providerReference || latest.id}` : '—', dateTime(latest?.paidAt || obligation.createdAt)];
        }),
        ...cashierPayments.map((payment) => {
          const parent = obligations.find(
            (obligation) =>
              obligation.referenceType === payment.transactionType &&
              obligation.referenceId === payment.sourceId,
          );
          const parentPaid = parent ? obligationPaid(parent) : null;
          const parentBalance = parent
            ? Math.max(0, Number(parent.totalAmount || 0) - parentPaid)
            : null;

          return [
            `Payment log · ${payment.transactionType || 'CASHIER PAYMENT'}`,
            parent ? money(parent.totalAmount) : '—',
            money(payment.amount),
            parent ? money(parentBalance) : '—',
            parent ? parent.status : 'SUCCESSFUL',
            `${payment.method} / ${String(payment.method || '').toUpperCase() === 'CASH' ? 'No reference (cash)' : payment.reference || '—'}`,
            dateTime(payment.createdAt),
          ];
        }),
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
      columns: ['Room', 'Customer / status', 'Start', 'End'],
      summary: [
        { label: 'Total bookings', value: bookings.length },
        { label: 'Total completed', value: bookings.filter((item) => item.status === 'COMPLETED').length },
        { label: 'Cancelled bookings', value: bookings.filter((item) => item.status === 'CANCELLED').length },
        { label: 'Most used room', value: topRoom ? `${topRoom[0]} (${topRoom[1]})` : '—' },
      ],
      rows: bookings.map((booking) => [booking.room?.resource?.name || booking.roomNameAtBooking || 'Room', `${customerName(booking)} / ${booking.status}`, dateTime(booking.scheduledStart), dateTime(booking.scheduledEnd)]),
    };
  }

  if (type === 'instrument-usage') {
    const [rentals, inventory] = await Promise.all([
      reportsRepository.findRentals(appId, from, to),
      reportsRepository.findInstruments(appId),
    ]);
    const rentalItems = rentals.flatMap((rental) => (rental.items || []).map((item) => ({ ...item, rental })));
    const rentalCounts = new Map(countBy(rentalItems, (item) => item.instrumentId));
    const latestRental = new Map();
    rentalItems.forEach((item) => {
      const key = item.instrument?.id || item.instrument?.resourceId;
      if (!latestRental.has(key) || new Date(item.rental?.scheduledStart || 0) > new Date(latestRental.get(key)?.rental?.scheduledStart || 0)) latestRental.set(key, item);
    });
    const itemRows = inventory.map((instrument) => {
      const currentRental = latestRental.get(instrument.id);
      return [
        instrument.instrumentType?.name || 'Uncategorized',
        [instrument.brand, instrument.model].filter(Boolean).join(' / ') || 'Not recorded',
        instrument.serialNumber || 'Not recorded',
        instrument.status || 'UNKNOWN',
        rentalCounts.get(instrument.id) || 0,
        dateTime(currentRental?.rental?.scheduledStart),
        instrument.rentalRate ? money(instrument.rentalRate) : 'Not set',
      ];
    });
    return {
      columns: ['Item', 'Brand / Model', 'Serial No.', 'Status', 'Rental count', 'Last rented', 'Rental rate'],
      summary: [{ label: 'Total items', value: inventory.length }],
      rows: itemRows,
    };
  }

  if (type === 'dashboard-activity') {
    const [enrollments, bookings, rentals, obligations, cashierPayments] = await Promise.all([
      reportsRepository.findEnrollments(appId, from, to),
      reportsRepository.findRoomBookings(appId, from, to),
      reportsRepository.findRentals(appId, from, to),
      reportsRepository.findPayments(appId, from, to),
      reportsRepository.findCashierPayments(appId, from, to),
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
    const allSuccessfulPayments = [
      ...successfulPayments,
      ...cashierPayments.map((payment) => ({
        ...payment,
        referenceType: payment.transactionType,
        referenceId: payment.sourceId,
        paidAt: payment.createdAt,
      })),
    ];
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
    allSuccessfulPayments.forEach((payment) => {
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
        successfulPaymentAmount: allSuccessfulPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        ),
        successfulTransactionCount: allSuccessfulPayments.length,
      },
      recentPayments: [...allSuccessfulPayments]
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
      columns: ['Student', 'Course', 'Lesson status', 'Attendance', 'Date', 'Session ID'],
    rows: [
      ['Lessons scheduled', sessions.length],
      ['Lessons completed', sessions.filter((session) => session.status === 'COMPLETED').length],
      ['Attendance rate', sessions.length ? `${Math.round((attended.length / sessions.length) * 100)}%` : '0%'],
      ['Students needing follow-up', new Set(sessions.filter((session) => ['ABSENT', 'NO_SHOW'].includes(session.attendance?.status)).map((session) => session.enrollment?.customerId)).size],
      ...sessions.map((session) => [
        customerName(session.enrollment),
        packageCourses(session.enrollment?.lessonPackage).map((course) => course.name).join(', ') || '—',
        session.status,
        session.attendance?.status || 'NOT_RECORDED',
        dateTime(session.scheduledStart),
        session.id,
      ]),
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

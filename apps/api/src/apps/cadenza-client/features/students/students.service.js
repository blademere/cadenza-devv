import { studentsRepository } from './students.repository.js';

const fullName = (person) =>
  [person.firstName, person.middleName, person.lastName, person.suffix]
    .filter(Boolean)
    .join(' ');

const ENROLLED_STATUSES = new Set(['ACTIVE', 'AT_RISK', 'APPROVED']);

const getEnrollmentBilling = (enrollment) => {
  const metadata = enrollment.metadata || {};
  const totalAmount = Number(enrollment.priceAtEnrollment || enrollment.lessonPackage?.price || 0);
  const paymentStatus = metadata.paymentStatus || 'PENDING';
  const paidAmount = paymentStatus === 'PENDING_CONFIRMATION'
    ? 0
    : Number(metadata.paymentAmount ?? metadata.initialPaymentAmount ?? 0);

  return {
    totalAmount,
    paidAmount,
    remainingBalance: Math.max(totalAmount - paidAmount, 0),
    paymentStatus,
    nextPaymentDue: enrollment.paymentExpiresAt || metadata.paymentDueDate || null,
    paymentScheduleHistory: Array.isArray(metadata.paymentScheduleHistory) ? metadata.paymentScheduleHistory : [],
  };
};

const getEnrollmentCourses = (enrollment) => {
  const packageItem = enrollment.lessonPackage;
  const legacyCourses = packageItem?.lessons ?? [];
  const mappedCourses = (packageItem?.courseMappings ?? [])
    .map((mapping) => mapping.course)
    .filter(Boolean);
  const availableCourses = [...legacyCourses, ...mappedCourses];
  const selectedCourseId = enrollment.metadata?.courseId;

  return selectedCourseId
    ? availableCourses.filter((course) => course.id === selectedCourseId)
    : availableCourses;
};

const mapStudent = (student) => {
  const enrollments = student.enrollments ?? [];
  const enrolledRecords = enrollments.filter((enrollment) =>
    ENROLLED_STATUSES.has(enrollment.status),
  );
  const courses = [
    ...new Map(
      enrolledRecords
        .flatMap(getEnrollmentCourses)
        .map((course) => [course.id, course]),
    ).values(),
  ];
  const instructors = [
    ...new Map(
      enrolledRecords
        .flatMap((enrollment) => enrollment.sessions ?? [])
        .map((session) => session.instructor?.person)
        .filter(Boolean)
        .map((person) => [person.firstName + person.lastName, fullName(person)]),
    ).values(),
  ];

  return {
    id: student.id,
    personId: student.person.id,
    name: fullName(student.person),
    email: student.person.email,
    phone: student.person.phone,
    status: enrollments.some((enrollment) => enrollment.status === 'AT_RISK')
      ? 'AT_RISK'
      : student.status,
    isActive: student.person.isActive,
    courses,
    instructors,
    enrollments: enrollments.map((enrollment) => ({
      id: enrollment.id,
      packageName: enrollment.lessonPackage?.name ?? null,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      courses: getEnrollmentCourses(enrollment),
      sessions: (enrollment.sessions ?? []).map((session) => ({
        id: session.id,
        roomId: session.roomId,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        status: session.status,
      })),
      billing: getEnrollmentBilling(enrollment),
    })),
    createdAt: student.createdAt,
  };
};

export const studentsService = {
  async getStudents(appId, filters = {}) {
    const result = await studentsRepository.findAll(appId, filters);
    return { ...result, items: result.items.map(mapStudent) };
  },
};

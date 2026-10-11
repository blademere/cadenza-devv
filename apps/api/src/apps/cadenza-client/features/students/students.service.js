import { studentsRepository } from './students.repository.js';

const fullName = (person) =>
  [person.firstName, person.middleName, person.lastName, person.suffix]
    .filter(Boolean)
    .join(' ');

const mapStudent = (student) => {
  const enrollments = student.enrollments ?? [];
  const courses = [
    ...new Map(
      enrollments
        .flatMap((enrollment) => enrollment.lessonPackage?.lessons ?? [])
        .map((course) => [course.id, course]),
    ).values(),
  ];
  const instructors = [
    ...new Map(
      enrollments
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
    status: student.status,
    isActive: student.person.isActive,
    courses,
    instructors,
    enrollments: enrollments.map((enrollment) => ({
      id: enrollment.id,
      packageName: enrollment.lessonPackage?.name ?? null,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      courses: enrollment.lessonPackage?.lessons ?? [],
    })),
    createdAt: student.createdAt,
  };
};

export const studentsService = {
  async getStudents(appId) {
    const students = await studentsRepository.findAll(appId);
    return students.map(mapStudent);
  },
};

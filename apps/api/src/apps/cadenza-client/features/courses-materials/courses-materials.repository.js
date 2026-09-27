import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const courseInclude = {
  package: true,
  materials: {
    orderBy: {
      createdAt: 'asc',
    },
  },
};

export const coursesRepository = {
  findAllCourses(appId) {
    return prisma.cadenzaCourse.findMany({
      where: {
        appId,
      },
      include: courseInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  findCourseById(appId, id) {
    return prisma.cadenzaCourse.findFirst({
      where: {
        id,
        appId,
      },
      include: courseInclude,
    });
  },

  findPackage(appId, packageId) {
    return prisma.cadenzaLessonPackage.findFirst({
      where: {
        id: packageId,
        appId,
        status: 'ACTIVE',
      },
    });
  },

  createCourse(data) {
    return prisma.cadenzaCourse.create({
      data,
      include: courseInclude,
    });
  },

  updateCourse(appId, id, data) {
    return prisma.cadenzaCourse.updateMany({
      where: {
        id,
        appId,
      },
      data,
    });
  },

  createMaterial(data) {
    return prisma.cadenzaCourseMaterial.create({
      data,
    });
  },

  deleteMaterial(
    appId,
    courseId,
    materialId,
  ) {
    return prisma.cadenzaCourseMaterial.deleteMany({
      where: {
        id: materialId,
        courseId,
        course: {
          appId,
        },
      },
    });
  },

  deleteCourse(appId, id) {
    return prisma.cadenzaCourse.deleteMany({
      where: {
        id,
        appId,
      },
    });
  },
};
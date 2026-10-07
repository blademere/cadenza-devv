import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const courseInclude = {
  package: true,
  packageMappings: {
    include: {
      package: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
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

  findCourseByName(appId, name) {
    return prisma.cadenzaCourse.findFirst({
      where: {
        appId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
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

  findCoursePackage(appId, courseId, packageId) {
    return prisma.cadenzaCoursePackage.findFirst({
      where: {
        appId,
        courseId,
        packageId,
      },
    });
  },

  createCoursePackage(data) {
    return prisma.cadenzaCoursePackage.create({
      data,
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

  findMaterialByCourseAndName(courseId, name) {
    return prisma.cadenzaCourseMaterial.findFirst({
      where: {
        courseId,
        name,
      },
    });
  },

  deleteMaterial(appId, courseId, materialId) {
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

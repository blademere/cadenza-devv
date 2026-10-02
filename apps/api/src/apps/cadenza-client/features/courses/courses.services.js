import path from 'node:path';
import {
  access,
  mkdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import {
  BadRequestError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { coursesRepository } from './courses.repository.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STORAGE_ROOT = path.resolve(
  process.env.CADENZA_STORAGE_PATH ||
    path.join(process.cwd(), 'storage'),
);

const normalizeText = (value) =>
  String(value || '').trim();

const sanitizeFileName = (fileName) => {
  const name = path.basename(normalizeText(fileName));

  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
};

const mapMaterial = (material) => ({
  id: material.id,
  storageReference: material.storageReference,
  name: material.name || '',
  type: material.type,
  metadata: material.metadata || {},
  createdAt: material.createdAt,
  updatedAt: material.updatedAt,
});

const mapCourse = (course) => {
  if (!course) {
    return null;
  }

  const packageData = course.package || null;
  const packageMappings = Array.isArray(course.packageMappings)
    ? course.packageMappings
        .map((mapping) => mapping.package)
        .filter(Boolean)
    : [];

  if (packageData && !packageMappings.some((item) => item.id === packageData.id)) {
    packageMappings.unshift(packageData);
  }

  return {
    id: course.id,
    packageId: course.packageId || '',
    packageName: packageData?.name || '',
    packages: packageMappings.map((item) => ({
      id: item.id,
      name: item.name,
    })),
    packageIds: packageMappings.map((item) => item.id),
    lessonName: course.name || '',
    name: course.name || '',
    level: course.level || '',
    status: course.status,
    files: Array.isArray(course.materials)
      ? course.materials.map(mapMaterial)
      : [],
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
};

const validateCourseData = ({
  packageId,
  courseId,
  courseName,
}) => {
  const normalizedPackageId =
    normalizeText(packageId);

  const normalizedCourseId =
    normalizeText(courseId);

  const normalizedCourseName =
    normalizeText(courseName);

  if (!normalizedCourseId && !normalizedCourseName) {
    throw new BadRequestError(
      'Course or course name is required.',
    );
  }

  return {
    packageId: normalizedPackageId,
    courseId: normalizedCourseId,
    courseName: normalizedCourseName,
  };
};

const validateFiles = (files = []) => {
  if (!Array.isArray(files)) {
    throw new BadRequestError(
      'Course files must be an array.',
    );
  }

  return files.map((file) => {
    if (!file?.buffer) {
      throw new BadRequestError(
        'Invalid uploaded file.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError(
        `${file.originalname || 'File'} is larger than 10 MB.`,
      );
    }

    const fileName = sanitizeFileName(
      file.originalname,
    );

    if (!fileName) {
      throw new BadRequestError(
        'Uploaded file must have a valid name.',
      );
    }

    return {
      file,
      fileName,
    };
  });
};

const saveUploadedFile = async (
  courseId,
  uploadedFile,
) => {
  const safeFileName =
    sanitizeFileName(
      uploadedFile.originalname,
    );

  const extension =
    path.extname(safeFileName);

  const baseName =
    path.basename(
      safeFileName,
      extension,
    );

  const uniqueName =
    `${baseName}-${randomUUID()}${extension}`;

  const relativePath = path.join(
    'cadenza-client',
    'courses',
    courseId,
    uniqueName,
  );

  const absolutePath = path.join(
    STORAGE_ROOT,
    relativePath,
  );

  await mkdir(
    path.dirname(absolutePath),
    {
      recursive: true,
    },
  );

  await writeFile(
    absolutePath,
    uploadedFile.buffer,
  );

  return {
    relativePath:
      relativePath.replaceAll(
        path.sep,
        '/',
      ),
    absolutePath,
  };
};

const removeStoredFile = async (
  absolutePath,
) => {
  if (!absolutePath) {
    return;
  }

  try {
    await unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const resolveStoragePath = (
  storageReference,
) => {
  if (!storageReference) {
    return null;
  }

  const normalizedReference =
    String(storageReference)
      .replaceAll('\\', '/')
      .replace(/^\/+/, '');

  const absolutePath = path.resolve(
    STORAGE_ROOT,
    normalizedReference,
  );

  const rootWithSeparator =
    `${STORAGE_ROOT}${path.sep}`;

  if (
    absolutePath !== STORAGE_ROOT &&
    !absolutePath.startsWith(
      rootWithSeparator,
    )
  ) {
    throw new BadRequestError(
      'Invalid file path.',
    );
  }

  return absolutePath;
};

export const coursesService = {
  async getCourses(appId) {
    const courses =
      await coursesRepository.findAllCourses(
        appId,
      );

    return courses.map(mapCourse);
  },

  async getCourseById(appId, id) {
    const course =
      await coursesRepository.findCourseById(
        appId,
        id,
      );

    if (!course) {
      throw new NotFoundError(
        'Course not found.',
      );
    }

    return mapCourse(course);
  },

  async getCourseFile(
    appId,
    courseId,
    filename,
  ) {
    const course =
      await coursesRepository.findCourseById(
        appId,
        courseId,
      );

    if (!course) {
      throw new NotFoundError(
        'Course not found.',
      );
    }

    const requestedFileName =
      path.basename(
        normalizeText(filename),
      );

    if (!requestedFileName) {
      throw new BadRequestError(
        'File name is required.',
      );
    }

    const material =
      Array.isArray(course.materials)
        ? course.materials.find(
            (item) => {
              const storedFileName =
                item.metadata?.storedFileName;

              const referenceFileName =
                item.storageReference
                  ? path.basename(
                      item.storageReference,
                    )
                  : null;

              const originalFileName =
                item.metadata?.fileName;

              return (
                storedFileName ===
                  requestedFileName ||
                referenceFileName ===
                  requestedFileName ||
                originalFileName ===
                  requestedFileName
              );
            },
          )
        : null;

    if (!material) {
      throw new NotFoundError(
        'Course material not found.',
      );
    }

    if (!material.storageReference) {
      throw new NotFoundError(
        'Course material file not found.',
      );
    }

    const absolutePath =
      resolveStoragePath(
        material.storageReference,
      );

    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundError(
        'Course material file not found.',
      );
    }

    return {
      absolutePath,
      type:
        material.metadata?.mimeType ||
        material.type ||
        'application/octet-stream',
      fileName:
        material.metadata?.fileName ||
        requestedFileName,
    };
  },

  async createCourse(appId, data) {
    const {
      packageId,
      courseId,
      courseName,
    } = validateCourseData({
      packageId: data.packageId,
      courseId: data.courseId,
      courseName: data.courseName,
    });

    if (packageId) {
      const packageData =
        await coursesRepository.findPackage(
          appId,
          packageId,
        );

      if (!packageData) {
        throw new NotFoundError(
          'Enrollment package not found or inactive.',
        );
      }
    }

    const files =
      validateFiles(
        data.files || [],
      );

    let course;

    try {
      if (courseId) {
        course = await coursesRepository.findCourseById(
          appId,
          courseId,
        );

        if (!course) {
          throw new NotFoundError(
            'Course not found.',
          );
        }

        const existingMapping =
          await coursesRepository.findCoursePackage(
            appId,
            course.id,
            packageId,
          );

        if (!existingMapping) {
          await coursesRepository.createCoursePackage({
            appId,
            courseId: course.id,
            packageId,
          });
        }
      } else {
        course = await coursesRepository.createCourse({
          appId,
          ...(packageId ? { packageId } : {}),
          name: courseName,
          description: null,
          level: null,
          status: 'ACTIVE',
          metadata: null,
        });
      }

      if (packageId) {
        const existingMapping =
          await coursesRepository.findCoursePackage(
            appId,
            course.id,
            packageId,
          );

        if (!existingMapping) {
          await coursesRepository.createCoursePackage({
            appId,
            courseId: course.id,
            packageId,
          });
        }
      }

      const storedFiles = [];

      try {
        for (const uploaded of files) {
          const existingMaterial =
            await coursesRepository.findMaterialByCourseAndName(
              course.id,
              uploaded.file.originalname,
            );

          if (existingMaterial) {
            continue;
          }

          const stored =
            await saveUploadedFile(
              course.id,
              uploaded.file,
            );

          storedFiles.push(stored);

          await coursesRepository.createMaterial({
            courseId: course.id,
            storageReference:
              stored.relativePath,
            name:
              uploaded.file.originalname,
            type:
              uploaded.file.mimetype ||
              'application/octet-stream',
            metadata: {
              fileName:
                uploaded.file.originalname,
              storedFileName:
                path.basename(
                  stored.relativePath,
                ),
              mimeType:
                uploaded.file.mimetype ||
                'application/octet-stream',
              size:
                uploaded.file.size,
            },
          });
        }
      } catch (error) {
        for (const stored of storedFiles) {
          await removeStoredFile(
            stored.absolutePath,
          );
        }

        throw error;
      }
    } catch (error) {
      throw error;
    }

    const result =
      await coursesRepository.findCourseById(
        appId,
        course.id,
      );

    return mapCourse(result);
  },

  async updateCourse(
    appId,
    id,
    data,
  ) {
    const course =
      await coursesRepository.findCourseById(
        appId,
        id,
      );

    if (!course) {
      throw new NotFoundError(
        'Course not found.',
      );
    }

    const packageId =
      data.packageId !== undefined
        ? normalizeText(data.packageId)
        : course.packageId;

    const lessonName =
      data.courseName !== undefined
        ? normalizeText(data.courseName)
        : data.lessonName !== undefined
          ? normalizeText(data.lessonName)
          : course.name;

    if (!packageId) {
      throw new BadRequestError(
        'Package is required.',
      );
    }

    if (!lessonName) {
      throw new BadRequestError('Course name is required.');
    }

    if (
      packageId !== course.packageId
    ) {
      const packageData =
        await coursesRepository.findPackage(
          appId,
          packageId,
        );

      if (!packageData) {
        throw new NotFoundError(
          'Enrollment package not found or inactive.',
        );
      }
    }

    const files =
      validateFiles(
        data.files || [],
      );

    await coursesRepository.updateCourse(
      appId,
      id,
      {
        name: lessonName,
      },
    );

    const existingMapping =
      await coursesRepository.findCoursePackage(
        appId,
        id,
        packageId,
      );

    if (!existingMapping) {
      await coursesRepository.createCoursePackage({
        appId,
        courseId: id,
        packageId,
      });
    }

    const storedFiles = [];

    try {
        for (const uploaded of files) {
          const existingMaterial =
            await coursesRepository.findMaterialByCourseAndName(
              id,
              uploaded.file.originalname,
            );

          if (existingMaterial) {
            continue;
          }

          const stored =
            await saveUploadedFile(
            id,
            uploaded.file,
          );

        storedFiles.push(stored);

        await coursesRepository.createMaterial({
          courseId: id,
          storageReference:
            stored.relativePath,
          name:
            uploaded.file.originalname,
          type:
            uploaded.file.mimetype ||
            'application/octet-stream',
          metadata: {
            fileName:
              uploaded.file.originalname,
            storedFileName:
              path.basename(
                stored.relativePath,
              ),
            mimeType:
              uploaded.file.mimetype ||
              'application/octet-stream',
            size:
              uploaded.file.size,
          },
        });
      }
    } catch (error) {
      for (const stored of storedFiles) {
        await removeStoredFile(
          stored.absolutePath,
        );
      }

      throw error;
    }

    const result =
      await coursesRepository.findCourseById(
        appId,
        id,
      );

    return mapCourse(result);
  },

  async deactivateCourse(appId, id) {
    const course =
      await coursesRepository.findCourseById(
        appId,
        id,
      );

    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    await coursesRepository.updateCourse(
      appId,
      id,
      {
        status: 'INACTIVE',
        packageId: null,
      },
    );

    const result =
      await coursesRepository.findCourseById(
        appId,
        id,
      );

    return mapCourse(result);
  },

  async deleteCourse(
    appId,
    id,
  ) {
    const current =
      await coursesRepository.findCourseById(
        appId,
        id,
      );

    if (!current) {
      throw new NotFoundError(
        'Course not found.',
      );
    }

    const materials =
      Array.isArray(current.materials)
        ? current.materials
        : [];

    for (const material of materials) {
      if (!material.storageReference) {
        continue;
      }

      const absolutePath =
        resolveStoragePath(
          material.storageReference,
        );

      await removeStoredFile(
        absolutePath,
      );
    }

    await coursesRepository.deleteCourse(
      appId,
      id,
    );

    return {
      id,
      deleted: true,
    };
  },

  async deleteAttachment(
    appId,
    courseId,
    materialId,
  ) {
    const course =
      await coursesRepository.findCourseById(
        appId,
        courseId,
      );

    if (!course) {
      throw new NotFoundError(
        'Course not found.',
      );
    }

    const material =
      Array.isArray(course.materials)
        ? course.materials.find(
            (item) =>
              item.id === materialId,
          )
        : null;

    if (!material) {
      throw new NotFoundError(
        'Course material not found.',
      );
    }

    const result =
      await coursesRepository.deleteMaterial(
        appId,
        courseId,
        materialId,
      );

    if (!result.count) {
      throw new NotFoundError(
        'Course material not found.',
      );
    }

    if (material.storageReference) {
      await removeStoredFile(
        resolveStoragePath(
          material.storageReference,
        ),
      );
    }

    return {
      id: materialId,
      deleted: true,
    };
  },
};

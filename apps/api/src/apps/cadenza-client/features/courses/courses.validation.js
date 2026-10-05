import { BadRequestError } from '../../../../common/errors/appError.js';

const validateId = (value, fieldName) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError(`${fieldName} is required.`);
  }
};

const validatePackageId = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError('Package is required.');
  }
};

const validateLessonName = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError('Lesson name is required.');
  }
};

const validateCourseId = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError('Course is required.');
  }
};

const validateCourseName = (value) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError('Course name is required.');
  }
};

const validateFiles = (files) => {
  if (files !== undefined && !Array.isArray(files)) {
    throw new BadRequestError('Invalid course files.');
  }
};

export const idValidator = (req, res, next) => {
  try {
    validateId(req.params.id, 'Course ID');

    next();
  } catch (error) {
    next(error);
  }
};

export const attachmentIdValidator = (req, res, next) => {
  try {
    validateId(req.params.id, 'Course ID');

    validateId(req.params.attachmentId, 'Material ID');

    next();
  } catch (error) {
    next(error);
  }
};

export const createValidator = (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      throw new BadRequestError('Request body is required.');
    }

    if (req.body.packageId !== undefined) {
      validatePackageId(req.body.packageId);
    }

    if (req.body.courseId) {
      validateCourseId(req.body.courseId);
    } else {
      validateCourseName(req.body.courseName);
    }

    validateFiles(req.files);

    next();
  } catch (error) {
    next(error);
  }
};

export const updateValidator = (req, res, next) => {
  try {
    validateId(req.params.id, 'Course ID');

    if (!req.body || typeof req.body !== 'object') {
      throw new BadRequestError('Request body is required.');
    }

    if (
      req.body.packageId === undefined &&
      req.body.lessonName === undefined &&
      req.body.courseName === undefined &&
      (!req.files || req.files.length === 0)
    ) {
      throw new BadRequestError('At least one field or material is required.');
    }

    if (req.body.packageId !== undefined) {
      validatePackageId(req.body.packageId);
    }

    if (req.body.lessonName !== undefined) {
      validateLessonName(req.body.lessonName);
    }

    if (req.body.courseName !== undefined) {
      validateCourseName(req.body.courseName);
    }

    validateFiles(req.files);

    next();
  } catch (error) {
    next(error);
  }
};

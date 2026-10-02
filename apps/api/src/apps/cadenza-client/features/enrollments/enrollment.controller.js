import { enrollmentService } from './enrollment.service.js';

export const enrollmentController = {
  async getAvailablePackages(req, res, next) {
    try {
      const packages = await enrollmentService.getAvailablePackages(
        req.cadenzaApp.id,
      );

      return res.json({
        success: true,
        data: packages,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCompatibleInstructors(req, res, next) {
    try {
      const instructors = await enrollmentService.getCompatibleInstructors(
        req.cadenzaApp.id,
        req.params.packageId,
        req.query.courseId,
      );

      return res.json({
        success: true,
        data: instructors,
      });
    } catch (error) {
      next(error);
    }
  },

  async getInstructorAvailability(req, res, next) {
    try {
      const result = await enrollmentService.getInstructorAvailability(
        req.cadenzaApp.id,
        req.params.packageId,
        req.params.instructorId,
        req.query.courseId,
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async createEnrollment(req, res, next) {
    try {
      const enrollment = await enrollmentService.createEnrollment(
        req.cadenzaApp.id,
        req.cadenzaCustomer.id,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: 'Enrollment created successfully.',
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyEnrollment(req, res, next) {
    try {
      const enrollment = await enrollmentService.getMyEnrollment(
        req.cadenzaApp.id,
        req.cadenzaCustomer.id,
      );

      return res.json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  },

  async getEnrollmentById(req, res, next) {
    try {
      const enrollment = await enrollmentService.getEnrollmentById(
        req.cadenzaApp.id,
        req.cadenzaCustomer.id,
        req.params.id,
      );

      return res.json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelEnrollment(req, res, next) {
    try {
      const enrollment = await enrollmentService.cancelEnrollment(
        req.cadenzaApp.id,
        req.cadenzaCustomer.id,
        req.params.id,
      );

      return res.json({
        success: true,
        message: 'Enrollment cancelled successfully.',
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  },
};

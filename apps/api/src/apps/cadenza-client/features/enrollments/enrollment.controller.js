import { enrollmentService } from './enrollment.service.js';
import { broadcastEnrollmentsChanged } from '../../../../platform/websocket/enrollments.socket.js';

export const enrollmentController = {
  async emergencyReschedule(req, res, next) {
    try {
      return res.json({ success: true, message: 'Emergency reschedule saved successfully.', data: await enrollmentService.emergencyReschedule(req.cadenzaApp.id, req.body) });
    } catch (error) { next(error); }
  },
  async getRescheduleRequests(req, res, next) {
    try {
      const requests = await enrollmentService.getRescheduleRequests(req.cadenzaApp.id);
      return res.json({ success: true, data: requests });
    } catch (error) { next(error); }
  },
  async submitRescheduleOptions(req, res, next) {
    try {
      const result = await enrollmentService.submitRescheduleOptions(req.cadenzaApp.id, req.params.id, req.body?.options || []);
      return res.json({ success: true, message: 'Replacement schedule options submitted.', data: result });
    } catch (error) { next(error); }
  },
  async confirmReschedule(req, res, next) {
    try {
      const result = await enrollmentService.confirmReschedule(req.cadenzaApp.id, req.params.id, req.body?.option);
      return res.json({ success: true, message: 'Matching schedule confirmed.', data: result });
    } catch (error) { next(error); }
  },
  async assignRoom(req, res, next) {
    try { return res.json({ success: true, message: 'Room assigned successfully.', data: await enrollmentService.assignRoom(req.cadenzaApp.id, req.params.sessionId, req.body?.roomId, { reason: req.body?.reason, personId: req.cadenzaStaff?.personId }) }); } catch (error) { next(error); }
  },
  async getEnrollments(req, res, next) {
    try {
      const enrollments = await enrollmentService.getEnrollments(
        req.cadenzaApp.id,
        { status: req.query.status, page: req.query.page, limit: req.query.limit },
      );

      return res.json({
        success: true,
        data: enrollments.items,
        pagination: enrollments.pagination,
      });
    } catch (error) {
      next(error);
    }
  },
  async updateEnrollmentStatus(req, res, next) {
    try {
      const enrollment = await enrollmentService.updateEnrollmentStatus(req.cadenzaApp.id, req.params.id, req.body?.status);
      broadcastEnrollmentsChanged();
      return res.json({ success: true, data: enrollment });
    } catch (error) { next(error); }
  },
  async notifyEnrollmentAtRisk(req, res, next) {
    try {
      const result = await enrollmentService.notifyEnrollmentAtRisk(req.cadenzaApp.id, req.params.id);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async notifyEnrollmentPaymentDue(req, res, next) {
    try {
      const result = await enrollmentService.notifyEnrollmentPaymentDue(req.cadenzaApp.id, req.params.id);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async addEnrollmentPaymentDue(req, res, next) {
    try {
      const result = await enrollmentService.addEnrollmentPaymentDue(req.cadenzaApp.id, req.params.id, req.body.nextPaymentDue, req.user.id);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async getAvailablePackages(req, res, next) {
    try {
      const packages = await enrollmentService.getAvailablePackages(
        req.cadenzaApp.id,
        req.cadenzaCustomer.id,
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
        req.cadenzaCustomer.id,
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
        req.query.roomId,
        req.query.startDate,
        req.cadenzaCustomer.id,
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
      broadcastEnrollmentsChanged();

      return res.status(201).json({
        success: true,
        message: 'Enrollment created successfully.',
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  },

  async validateSchedule(req, res, next) {
    try {
      const result = await enrollmentService.validateSchedule(
        req.cadenzaApp.id,
        req.body,
        req.cadenzaCustomer.id,
      );

      return res.json({ success: true, data: result });
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

  async approveEnrollment(req, res, next) {
    try {
      const enrollment = await enrollmentService.approveEnrollment(
        req.cadenzaApp.id,
        req.params.id,
      );
      broadcastEnrollmentsChanged();

      return res.json({
        success: true,
        message: 'Enrollment approved successfully.',
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelStaffEnrollment(req, res, next) {
    try {
      const enrollment = await enrollmentService.cancelStaffEnrollment(
        req.cadenzaApp.id,
        req.params.id,
        req.body?.reason,
      );
      broadcastEnrollmentsChanged();

      return res.json({
        success: true,
        message: 'Enrollment cancelled successfully.',
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
      broadcastEnrollmentsChanged();

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

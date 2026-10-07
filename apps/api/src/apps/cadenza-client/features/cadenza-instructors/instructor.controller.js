import { instructorService } from './instructor.service.js';
export const instructorController = {
  async getInstructors(req, res, next) {
    try {
      const instructors = await instructorService.getInstructors(
        req.cadenzaApp.id,
        {
          status: req.query.status,
          courseId: req.query.courseId,
        },
      );
      return res.json({ success: true, data: instructors });
    } catch (error) {
      next(error);
    }
  },
  async getInstructorById(req, res, next) {
    try {
      const instructor = await instructorService.getInstructorById(
        req.cadenzaApp.id,
        req.params.id,
      );
      return res.json({ success: true, data: instructor });
    } catch (error) {
      next(error);
    }
  },
  async createInstructorAccount(req, res, next) {
    try {
      const instructor = await instructorService.createInstructorAccount(
        req.cadenzaApp.id,
        req.body,
      );
      return res
        .status(201)
        .json({
          success: true,
          message: 'Instructor account created successfully',
          data: instructor,
        });
    } catch (error) {
      next(error);
    }
  },
  async createInstructor(req, res, next) {
    try {
      const instructor = await instructorService.createInstructor(
        req.cadenzaApp.id,
        req.body,
      );
      return res
        .status(201)
        .json({
          success: true,
          message: 'Instructor created successfully',
          data: instructor,
        });
    } catch (error) {
      next(error);
    }
  },
  async updateInstructor(req, res, next) {
    try {
      const instructor = await instructorService.updateInstructor(
        req.cadenzaApp.id,
        req.params.id,
        req.body,
      );
      return res.json({
        success: true,
        message: 'Instructor updated successfully',
        data: instructor,
      });
    } catch (error) {
      next(error);
    }
  },
  async deactivateInstructor(req, res, next) {
    try {
      const instructor = await instructorService.deactivateInstructor(
        req.cadenzaApp.id,
        req.params.id,
      );
      return res.json({
        success: true,
        message: 'Instructor deactivated successfully',
        data: instructor,
      });
    } catch (error) {
      next(error);
    }
  },
  async deactivateCourseMapping(req, res, next) {
    try {
      const instructor = await instructorService.deactivateCourseMapping(
        req.cadenzaApp.id,
        req.params.id,
        req.params.courseId,
      );
      return res.json({
        success: true,
        message: 'Instructor specialty deactivated successfully',
        data: instructor,
      });
    } catch (error) {
      next(error);
    }
  },
  async addCourseMapping(req, res, next) {
    try {
      const instructor = await instructorService.addCourseMapping(
        req.cadenzaApp.id,
        req.params.id,
        req.body,
      );
      return res.status(201).json({
        success: true,
        message: 'Instructor specialty added successfully',
        data: instructor,
      });
    } catch (error) {
      next(error);
    }
  },
  async getAvailability(req, res, next) {
    try {
      const availability = await instructorService.getAvailability(
        req.cadenzaApp.id,
        req.params.id,
      );
      return res.json({ success: true, data: availability });
    } catch (error) {
      next(error);
    }
  },
  async addAvailability(req, res, next) {
    try {
      const availability = await instructorService.addAvailability(
        req.cadenzaApp.id,
        req.params.id,
        req.body,
      );
      return res
        .status(201)
        .json({
          success: true,
          message: 'Instructor availability added successfully',
          data: availability,
        });
    } catch (error) {
      next(error);
    }
  },
  async updateAvailability(req, res, next) {
    try {
      const availability = await instructorService.updateAvailability(
        req.cadenzaApp.id,
        req.params.id,
        req.params.availabilityId,
        req.body,
      );
      return res.json({
        success: true,
        message: 'Instructor availability updated successfully',
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  },
  async deactivateAvailability(req, res, next) {
    try {
      const availability = await instructorService.deactivateAvailability(
        req.cadenzaApp.id,
        req.params.id,
        req.params.availabilityId,
      );
      return res.json({
        success: true,
        message: 'Instructor availability deactivated successfully',
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  },
  async getBlocks(req, res, next) {
    try {
      const blocks = await instructorService.getBlocks(
        req.cadenzaApp.id,
        req.params.id,
      );
      return res.json({ success: true, data: blocks });
    } catch (error) {
      next(error);
    }
  },
  async addBlock(req, res, next) {
    try {
      const block = await instructorService.addBlock(
        req.cadenzaApp.id,
        req.params.id,
        req.body,
      );
      return res
        .status(201)
        .json({
          success: true,
          message: 'Instructor unavailable period added successfully',
          data: block,
        });
    } catch (error) {
      next(error);
    }
  },
  async deleteBlock(req, res, next) {
    try {
      await instructorService.deleteBlock(
        req.cadenzaApp.id,
        req.params.id,
        req.params.blockId,
      );
      return res.json({
        success: true,
        message: 'Instructor unavailable period removed successfully',
      });
    } catch (error) {
      next(error);
    }
  },
  async checkAvailability(req, res, next) {
    try {
      const result = await instructorService.checkAvailability(
        req.cadenzaApp.id,
        req.params.id,
        req.query.startsAt,
        req.query.endsAt,
      );
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

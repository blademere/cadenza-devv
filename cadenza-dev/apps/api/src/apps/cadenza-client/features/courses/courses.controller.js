import { coursesService } from './courses.services.js';

export const coursesController = {
  async getCourses(req, res) {
    const appId = req.cadenzaApp.id;
    const data = await coursesService.getCourses(appId);

    return res.json({
      success: true,
      data,
    });
  },

  async getCourseById(req, res) {
    const appId = req.cadenzaApp.id;

    const data = await coursesService.getCourseById(appId, req.params.id);

    return res.json({
      success: true,
      data,
    });
  },

  async getCourseFile(req, res) {
    const appId = req.cadenzaApp.id;

    const file = await coursesService.getCourseFile(
      appId,
      req.params.courseId,
      req.params.filename,
    );

    res.setHeader('Content-Type', file.type || 'application/octet-stream');

    return res.sendFile(file.absolutePath);
  },

  async createCourse(req, res) {
    const appId = req.cadenzaApp.id;

    const data = await coursesService.createCourse(appId, {
      ...req.body,
      files: req.files || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      data,
    });
  },

  async updateCourse(req, res) {
    const appId = req.cadenzaApp.id;

    const data = await coursesService.updateCourse(appId, req.params.id, {
      ...req.body,
      files: req.files || [],
    });

    return res.json({
      success: true,
      message: 'Course updated successfully.',
      data,
    });
  },

  async deactivateCourse(req, res) {
    const appId = req.cadenzaApp.id;
    const data = await coursesService.deactivateCourse(
      appId,
      req.params.id,
    );

    return res.json({
      success: true,
      message: 'Course deactivated successfully.',
      data,
    });
  },

  async reactivateCourse(req, res) {
    const appId = req.cadenzaApp.id;
    const data = await coursesService.reactivateCourse(
      appId,
      req.params.id,
    );

    return res.json({
      success: true,
      message: 'Course reactivated successfully.',
      data,
    });
  },

  async deleteCourse(req, res) {
    const appId = req.cadenzaApp.id;

    const data = await coursesService.deleteCourse(appId, req.params.id);

    return res.json({
      success: true,
      message: 'Course deleted successfully.',
      data,
    });
  },

  async deleteAttachment(req, res) {
    const appId = req.cadenzaApp.id;

    const data = await coursesService.deleteAttachment(
      appId,
      req.params.id,
      req.params.attachmentId,
    );

    return res.json({
      success: true,
      message: 'Course material deleted successfully.',
      data,
    });
  },
};

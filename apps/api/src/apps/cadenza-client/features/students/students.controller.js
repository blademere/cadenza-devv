import { studentsService } from './students.service.js';

export const studentsController = {
  async getStudents(req, res, next) {
    try {
      const students = await studentsService.getStudents(req.cadenzaApp.id);

      return res.json({
        success: true,
        data: students,
      });
    } catch (error) {
      next(error);
    }
  },
};

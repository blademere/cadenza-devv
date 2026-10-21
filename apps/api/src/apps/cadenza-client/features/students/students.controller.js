import { studentsService } from './students.service.js';

export const studentsController = {
  async getStudents(req, res, next) {
    try {
      const result = await studentsService.getStudents(req.cadenzaApp.id, req.query);

      return res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },
};

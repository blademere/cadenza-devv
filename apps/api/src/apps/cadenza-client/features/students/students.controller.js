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
  async updateStatus(req, res, next) {
    try {
      const status = String(req.body?.status || '').toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE.' });
      const result = await studentsService.updateStatus(req.cadenzaApp.id, req.params.id, status);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
};

import { studentService } from './student.service.js';

export const studentController = {
  async dashboard(req, res) {
    res.json({ success: true, data: await studentService.getDashboard(req) });
  },

  async schedule(req, res) {
    res.json({ success: true, data: await studentService.getSchedule(req) });
  },

  async progress(req, res) {
    res.json({ success: true, data: await studentService.getProgress(req) });
  },

  async materials(req, res) {
    res.json({ success: true, data: await studentService.getMaterials(req) });
  },

  async material(req, res) {
    res.json({ success: true, data: await studentService.getMaterial(req, req.params.materialId) });
  },

  async requestSchedule(req, res) {
    const request = await studentService.requestSchedule(
      req,
      req.params.sessionId,
    );
    res.status(201).json({ success: true, message: 'Schedule request submitted for review.', data: request });
  },
  async chooseSchedule(req, res) {
    const result = await studentService.chooseSchedule(req, req.params.sessionId, req.body.optionIds);
    res.json({ success: true, message: 'Schedule choices submitted.', data: result });
  },
};

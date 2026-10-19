import { instructorService } from './instructor.service.js';

export const instructorController = {
  async dashboard(req, res) {
    res.json({ success: true, data: await instructorService.getDashboard(req) });
  },
  async schedule(req, res) {
    res.json({ success: true, data: await instructorService.getSchedule(req) });
  },
  async progress(req, res) {
    res.json({ success: true, data: await instructorService.getProgress(req) });
  },
  async attendance(req, res) {
    res.json({ success: true, data: await instructorService.getProgress(req) });
  },
  async recordAttendance(req, res) {
    const result = await instructorService.recordAttendance(req, req.body.sessionId, req.body.status, req.body.notes);
    res.status(201).json({ success: true, data: result });
  },
  async requestReschedule(req, res) {
    const result = await instructorService.requestReschedule(req, req.params.sessionId, req.body.requestedStart, req.body.reason);
    res.status(201).json({ success: true, message: 'Reschedule request submitted for Front Desk review.', data: result });
  },
};

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
  async saveFeedback(req, res) {
    const result = await instructorService.saveFeedback(req, req.body.sessionId, req.body.notes);
    res.json({ success: true, message: 'Instructor feedback saved.', data: result });
  },
  async chooseSchedule(req, res) {
    const result = await instructorService.chooseSchedule(req, req.params.sessionId, req.body.optionIds);
    res.json({ success: true, message: 'Schedule choice saved.', data: result });
  },
  async updateProfile(req, res) { res.json({ success: true, data: await instructorService.updateProfile(req, req.body) }); },
  async resetPassword(req, res) { res.json({ success: true, message: 'Password updated successfully.', data: await instructorService.resetPassword(req, req.body.currentPassword, req.body.newPassword) }); },
  async requestReschedule(req, res) {
    const result = await instructorService.requestReschedule(req, req.params.sessionId, req.body.requestedStart, req.body.reason);
    res.status(201).json({ success: true, message: 'Reschedule request submitted for Front Desk review.', data: result });
  },
};

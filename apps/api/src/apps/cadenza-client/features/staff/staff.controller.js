import { staffService } from './staff.services.js';

export const staffController = {
  async createStaffAccount(req, res, next) {
    try {
      const staff = await staffService.createStaffAccount(
        req.appContext.id,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: 'Staff account created successfully',
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },

  async getStaff(req, res, next) {
    try {
      const staff = await staffService.getStaff(req.appContext.id, {
        status: req.query.status,
        staffType: req.query.staffType,
      });

      return res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },

  async getStaffById(req, res, next) {
    try {
      const staff = await staffService.getStaffById(
        req.appContext.id,
        req.params.id,
      );

      return res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyStaffProfile(req, res, next) {
    try {
      const staff = await staffService.getMyStaffProfileByUserId(
        req.appContext.id,
        req.user.id,
      );

      return res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },

  async createStaff(req, res, next) {
    try {
      const staff = await staffService.createStaff(req.appContext.id, req.body);

      return res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStaff(req, res, next) {
    try {
      const staff = await staffService.updateStaff(
        req.appContext.id,
        req.params.id,
        req.body,
      );

      return res.json({
        success: true,
        message: 'Staff member updated successfully',
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },

  async deactivateStaff(req, res, next) {
    try {
      const staff = await staffService.deactivateStaff(
        req.appContext.id,
        req.params.id,
      );

      return res.json({
        success: true,
        message: 'Staff member deactivated successfully',
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  },
};

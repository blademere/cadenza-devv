import { successResponse } from '../../../../common/responses/apiResponse.js';

import * as service from './room-booking.service.js';

const getCustomerId = (req) => {
  if (!req.cadenzaCustomer?.id) {
    throw new Error(
      'Authenticated Cadenza customer is required.',
    );
  }

  return req.cadenzaCustomer.id;
};

const listAvailableRooms = async (req, res) =>
  successResponse(
    res,
    'Available Cadenza Client rooms retrieved successfully.',
    await service.listAvailableRooms({
      appId: req.cadenzaApp.id,
      scheduledStart:
        req.validated.query.scheduledStart,
      scheduledEnd:
        req.validated.query.scheduledEnd,
    }),
  );

const listMyBookings = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room bookings retrieved successfully.',
    await service.listMyBookings({
      appId: req.cadenzaApp.id,
      customerId: getCustomerId(req),
    }),
  );

const getMyBooking = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room booking retrieved successfully.',
    await service.getMyBooking({
      appId: req.cadenzaApp.id,
      customerId: getCustomerId(req),
      id: req.validated.params.id,
    }),
  );

const create = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room booking created successfully.',
    await service.create({
      appId: req.cadenzaApp.id,
      customerId: getCustomerId(req),
      ...req.validated.body,
    }),
    201,
  );

const cancel = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room booking cancelled successfully.',
    await service.cancel({
      appId: req.cadenzaApp.id,
      customerId: getCustomerId(req),
      id: req.validated.params.id,
      cancellationReason:
        req.validated.body.cancellationReason,
    }),
  );

export {
  listAvailableRooms,
  listMyBookings,
  getMyBooking,
  create,
  cancel,
};
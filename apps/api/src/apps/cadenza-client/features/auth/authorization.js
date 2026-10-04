import { ForbiddenError } from '../../../../common/errors/appError.js';

export const requireStaff = (req, res, next) => {
  if (!req.cadenzaAccount) {
    return next(new ForbiddenError('Cadenza account is required.'));
  }

  if (req.cadenzaAccount.type !== 'STAFF') {
    return next(new ForbiddenError('Staff access is required.'));
  }

  return next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.cadenzaAccount) {
    return next(new ForbiddenError('Cadenza account is required.'));
  }

  if (req.cadenzaAccount.type !== 'STAFF') {
    return next(new ForbiddenError('Staff access is required.'));
  }

  if (req.cadenzaAccount.staffType !== 'ADMIN') {
    return next(
      new ForbiddenError('Administrator access is required.'),
    );
  }

  return next();
};

export const requireAdminOrFrontDesk = (req, res, next) => {
  if (!req.cadenzaAccount) {
    return next(new ForbiddenError('Cadenza account is required.'));
  }

  if (req.cadenzaAccount.type !== 'STAFF') {
    return next(new ForbiddenError('Staff access is required.'));
  }

  if (
    !['ADMIN', 'FRONT_DESK'].includes(
      req.cadenzaAccount.staffType,
    )
  ) {
    return next(
      new ForbiddenError('Staff access is required.'),
    );
  }

  return next();
};

export const requireClient = (req, res, next) => {
  if (!req.cadenzaAccount) {
    return next(new ForbiddenError('Cadenza account is required.'));
  }

  if (req.cadenzaAccount.type !== 'CLIENT') {
    return next(
      new ForbiddenError('Client access is required.'),
    );
  }

  return next();
};

export const requireClientOrStaff = (req, res, next) => {
  if (!req.cadenzaAccount) {
    return next(new ForbiddenError('Cadenza account is required.'));
  }

  if (!['CLIENT', 'STAFF'].includes(req.cadenzaAccount.type)) {
    return next(
      new ForbiddenError('Client or staff access is required.'),
    );
  }

  return next();
};
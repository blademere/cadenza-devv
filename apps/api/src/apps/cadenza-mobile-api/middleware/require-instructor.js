import { ForbiddenError } from '../../../common/errors/appError.js';

export default function requireInstructor(req, _res, next) {
  const account = req.cadenzaAccount;
  const isInstructor = account?.type === 'INSTRUCTOR'
    || (account?.type === 'STAFF' && String(account.staffType || '').toUpperCase() === 'INSTRUCTOR');

  if (!isInstructor) return next(new ForbiddenError('Instructor access is required.'));
  return next();
}

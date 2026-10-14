import { UnauthorizedError } from '../../../common/errors/appError.js';
import { cadenzaAuthRepository } from '../../cadenza-client/features/auth/auth.repository.js';

const requireActiveEnrollment = async (req, _res, next) => {
  try {
    const isInstructorStaff =
      req.cadenzaAccount?.type === 'STAFF' &&
      String(req.cadenzaAccount.staffType || '').toUpperCase() ===
        'INSTRUCTOR';

    if (req.cadenzaAccount?.type === 'INSTRUCTOR' || isInstructorStaff) {
      return next();
    }

    if (req.cadenzaAccount?.type !== 'CLIENT' || !req.cadenzaCustomer) {
      return next(
        new UnauthorizedError(
          'An enrolled Cadenza client account is required for mobile access.',
        ),
      );
    }

    const activeEnrollment =
      await cadenzaAuthRepository.findActiveEnrollmentByCustomerId(
        req.cadenzaCustomer.id,
      );

    if (!activeEnrollment) {
      return next(
        new UnauthorizedError(
          'An approved enrollment is required for mobile access.',
        ),
      );
    }

    req.cadenzaEnrollment = activeEnrollment;
    req.cadenzaAccount.hasActiveEnrollment = true;
    req.cadenzaAccount.activeEnrollment = activeEnrollment;

    return next();
  } catch (error) {
    return next(error);
  }
};

export default requireActiveEnrollment;

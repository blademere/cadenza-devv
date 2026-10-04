import authenticate from '../../../../features/auth/authenticate.secure.js';
import { UnauthorizedError } from '../../../../common/errors/appError.js';
import { cadenzaAuthRepository } from './auth.repository.js';

const cadenzaAuthenticate = async (req, res, next) => {
  try {
    // The shared authenticator invokes its callback asynchronously. Wrap it
    // so this middleware does not resolve before the callback calls next().
    await new Promise((resolve, reject) => {
      authenticate(req, res, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const application = await cadenzaAuthRepository.findApplication();

    if (!application || !application.isActive) {
      return next(
        new UnauthorizedError('Cadenza application is unavailable.'),
      );
    }

    const staff = await cadenzaAuthRepository.findStaffByUserIdAndAppId(
      req.user.id,
      application.id,
    );

    if (staff) {
      if (staff.status !== 'ACTIVE') {
        return next(
          new UnauthorizedError('Cadenza staff account is inactive.'),
        );
      }

      req.cadenzaApp = application;
      req.cadenzaStaff = staff;
      req.cadenzaAccount = {
        type: 'STAFF',
        id: staff.id,
        staffType: staff.staffType,
        status: staff.status,
      };

      return next();
    }

    const customer = await cadenzaAuthRepository.findCustomerByUserIdAndAppId(
      req.user.id,
      application.id,
    );

    if (!customer) {
      return next(new UnauthorizedError('Cadenza account not found.'));
    }

    if (customer.status !== 'ACTIVE') {
      return next(
        new UnauthorizedError('Cadenza client account is inactive.'),
      );
    }

    req.cadenzaApp = application;
    req.cadenzaCustomer = customer;
    req.cadenzaAccount = {
      type: 'CLIENT',
      id: customer.id,
      status: customer.status,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

export default cadenzaAuthenticate;

import { enrollmentPackagesService } from './enrollment-packages.services.js';

export const enrollmentPackagesController = {
async getEnrollmentPackages(req, res, next) {
try {
const packages = await enrollmentPackagesService.getEnrollmentPackages(
req.cadenzaApp.id,
{
status: req.query.status,
},
);

  return res.json({
    success: true,
    data: packages,
  });
} catch (error) {
  next(error);
}

},

async getEnrollmentPackageById(req, res, next) {
try {
const packageItem =
await enrollmentPackagesService.getEnrollmentPackageById(
req.cadenzaApp.id,
req.params.id,
);

  return res.json({
    success: true,
    data: packageItem,
  });
} catch (error) {
  next(error);
}

},

async createEnrollmentPackage(req, res, next) {
try {
const packageItem =
await enrollmentPackagesService.createEnrollmentPackage(
req.cadenzaApp.id,
req.body,
);

  return res.status(201).json({
    success: true,
    message: 'Enrollment package created successfully.',
    data: packageItem,
  });
} catch (error) {
  next(error);
}

},

async updateEnrollmentPackage(req, res, next) {
try {
const packageItem =
await enrollmentPackagesService.updateEnrollmentPackage(
req.cadenzaApp.id,
req.params.id,
req.body,
);

  return res.json({
    success: true,
    message: 'Enrollment package updated successfully.',
    data: packageItem,
  });
} catch (error) {
  next(error);
}

},

async deactivateEnrollmentPackage(req, res, next) {
try {
const packageItem =
await enrollmentPackagesService.deactivateEnrollmentPackage(
req.cadenzaApp.id,
req.params.id,
);

  return res.json({
    success: true,
    message: 'Enrollment package deactivated successfully.',
    data: packageItem,
  });
} catch (error) {
  next(error);
}

},
};

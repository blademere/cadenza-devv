const { ValidationError } = require("../errors/appError");
const { ZodError } = require("zod");

const validate = (validator) => {
  return async (req, _res, next) => {
    try {
      const validated = await validator(req);
      req.validated = validated;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        return next(new ValidationError("Validation failed.", details));
      }

      return next(new ValidationError(error.message || "Validation failed.", error.details || []));
    }
  };
};

module.exports = validate;

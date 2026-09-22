import { ValidationError } from '../errors/appError.js'
import { ZodError } from 'zod'

const validate = (validator) => {
  return async (req, _res, next) => {
    try {
      const validated = await validator(req)

      req.validated = validated

      return next()
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))

        return next(new ValidationError('Validation failed.', details))
      }

      return next(error)
    }
  }
}

export default validate
export { validate }

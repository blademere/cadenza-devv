import { createTimer } from '../observability.service.js'

const startSpan = ({ operation, metric, labels, log = true } = {}) => {
  const timer = createTimer({ operation, metric, labels, log })
  return {
    end: (result = {}) => timer.end(result),
  }
}

export { startSpan }

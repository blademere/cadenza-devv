const withTimeout = (promise, timeoutMs, message = "Operation timed out") => {
  let timer

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
    timer.unref?.()
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

module.exports = { withTimeout }

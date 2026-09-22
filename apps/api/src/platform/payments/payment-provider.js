const createPaymentProvider = ({ createCheckout, parseWebhook, refundPayment = null }) => {
  if (typeof createCheckout !== 'function' || typeof parseWebhook !== 'function') {
    throw new TypeError('Payment provider requires createCheckout and parseWebhook functions.')
  }
  if (refundPayment !== null && typeof refundPayment !== 'function') {
    throw new TypeError('Payment provider refundPayment must be a function when supplied.')
  }
  return Object.freeze({ createCheckout, parseWebhook, refundPayment })
}

export { createPaymentProvider }
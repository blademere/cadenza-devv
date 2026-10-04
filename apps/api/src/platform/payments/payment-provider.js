const createPaymentProvider = ({ createCheckout, parseWebhook, getCheckoutStatus = null, refundPayment = null }) => {
  if (typeof createCheckout !== 'function' || typeof parseWebhook !== 'function') {
    throw new TypeError('Payment provider requires createCheckout and parseWebhook functions.')
  }
  if (getCheckoutStatus !== null && typeof getCheckoutStatus !== 'function') {
    throw new TypeError('Payment provider getCheckoutStatus must be a function when supplied.')
  }
  if (refundPayment !== null && typeof refundPayment !== 'function') {
    throw new TypeError('Payment provider refundPayment must be a function when supplied.')
  }
  return Object.freeze({ createCheckout, parseWebhook, getCheckoutStatus, refundPayment })
}

export { createPaymentProvider }
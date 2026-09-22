const createPaymentProvider = ({ createCheckout, parseWebhook }) => {
  if (typeof createCheckout !== 'function' || typeof parseWebhook !== 'function') {
    throw new TypeError('Payment provider requires createCheckout and parseWebhook functions.')
  }
  return Object.freeze({ createCheckout, parseWebhook })
}

export { createPaymentProvider }

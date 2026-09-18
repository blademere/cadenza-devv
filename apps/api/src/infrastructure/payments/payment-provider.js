const createPaymentProvider = ({ name, createPayment, refundPayment, getPayment }) => {
  if (!name) throw new TypeError('Payment provider name is required.')
  return Object.freeze({
    name,
    createPayment: typeof createPayment === 'function' ? createPayment : async () => {
      throw new Error(`Payment provider "${name}" does not implement createPayment.`)
    },
    refundPayment: typeof refundPayment === 'function' ? refundPayment : async () => {
      throw new Error(`Payment provider "${name}" does not implement refundPayment.`)
    },
    getPayment: typeof getPayment === 'function' ? getPayment : async () => {
      throw new Error(`Payment provider "${name}" does not implement getPayment.`)
    },
  })
}

export { createPaymentProvider }

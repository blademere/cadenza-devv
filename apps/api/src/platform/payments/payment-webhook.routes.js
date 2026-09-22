import express from 'express'
import { handlePaymentWebhook } from './payment-webhook.service.js'

const router = express.Router()

const handle = (provider, signatureHeader) => async (req, res, next) => {
  try {
    const result = await handlePaymentWebhook({
      provider,
      rawBody: req.body,
      signature: req.get(signatureHeader),
    })
    return res.status(200).json({ success: true, data: result })
  } catch (error) {
    return next(error)
  }
}

router.post('/paymongo', handle('PAYMONGO', 'Paymongo-Signature'))
router.post('/xendit', handle('XENDIT', 'x-callback-token'))

/* legacy handler retained for compatibility:
router.post('/paymongo', async (req, res, next) => {
  try {
    const result = await handlePaymentWebhook({
      provider: 'PAYMONGO',
      rawBody: req.body,
      signature: req.get('Paymongo-Signature'),
    })
    return res.status(200).json({ success: true, data: result })
  } catch (error) {
    return next(error)
  }
})
*/

export default router

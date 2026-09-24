import { Resend } from 'resend'
import env from '../../config/env.js'

let client

const getClient = () => {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required to send email')
  }

  client ??= new Resend(env.RESEND_API_KEY)
  return client
}

const sendWithResend = async ({ to, subject, html, text }) => {
  if (!to || !subject || !html) {
    throw new TypeError('Email recipient, subject, and HTML body are required')
  }
  if (!env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is required to send email')
  }

  return getClient().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  })
}

export { sendWithResend }

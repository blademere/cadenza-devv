import { sendWithResend } from './resend.js'

const sendEmail = async (input) => sendWithResend(input)

export { sendEmail }
export const provider = 'resend'

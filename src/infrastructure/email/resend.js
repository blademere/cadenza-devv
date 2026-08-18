const sendWithResend = async ({ to, subject, html }) => {
  return {
    provider: 'resend',
    to,
    subject,
    html,
    queued: true,
  }
}

module.exports = {
  sendWithResend,
}

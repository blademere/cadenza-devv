const sendWithNodemailer = async ({ to, subject, html }) => {
  return {
    provider: 'nodemailer',
    to,
    subject,
    html,
    queued: true,
  }
}

module.exports = {
  sendWithNodemailer,
}

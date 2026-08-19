const { sendWithResend } = require("./resend")

const sendEmail = async (input) => sendWithResend(input)

module.exports = {
  provider: "resend",
  sendEmail,
}

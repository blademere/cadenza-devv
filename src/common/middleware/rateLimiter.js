const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    errors: [],
  },
});

module.exports = rateLimiter;

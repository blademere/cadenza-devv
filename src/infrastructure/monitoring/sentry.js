const captureException = (error) => {
  return {
    provider: "sentry",
    message: error.message,
  };
};

module.exports = {
  captureException,
};

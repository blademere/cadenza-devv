const collectMetrics = () => {
  return {
    timestamp: new Date().toISOString(),
    service: "express-app",
  };
};

module.exports = {
  collectMetrics,
};

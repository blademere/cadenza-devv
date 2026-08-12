const metricsStore = {
  requestsTotal: 0,
};

const incrementRequests = () => {
  metricsStore.requestsTotal += 1;
  return metricsStore.requestsTotal;
};

module.exports = {
  incrementRequests,
};

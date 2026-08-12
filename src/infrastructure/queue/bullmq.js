const enqueueJob = async (queueName, payload) => {
  return {
    queueName,
    payload,
    id: `job-${Date.now()}`,
  };
};

module.exports = {
  enqueueJob,
};

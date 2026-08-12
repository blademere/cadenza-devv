const cache = new Map();

const redis = {
  get: async (key) => cache.get(key) || null,
  set: async (key, value) => {
    cache.set(key, value);
    return "OK";
  },
  del: async (key) => cache.delete(key),
};

module.exports = redis;

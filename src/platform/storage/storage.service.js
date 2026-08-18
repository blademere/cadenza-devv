function assertAdapter(adapter) {
  if (!adapter || typeof adapter.put !== "function" || typeof adapter.get !== "function" || typeof adapter.delete !== "function") {
    throw new TypeError("A storage adapter implementing put, get, and delete is required")
  }
}

function createStorageService(adapter) {
  assertAdapter(adapter)

  return {
    put(input) {
      return adapter.put(input)
    },
    get(input) {
      return adapter.get(input)
    },
    delete(input) {
      return adapter.delete(input)
    },
    head(input) {
      if (typeof adapter.head !== "function") throw new Error("Storage adapter does not support head")
      return adapter.head(input)
    },
    copy(input) {
      if (typeof adapter.copy !== "function") throw new Error("Storage adapter does not support copy")
      return adapter.copy(input)
    },
    getSignedUrl(input) {
      if (typeof adapter.getSignedUrl !== "function") throw new Error("Storage adapter does not support signed URLs")
      return adapter.getSignedUrl(input)
    },
  }
}

module.exports = {
  createStorageService,
}

function createObjectStorageAdapter({
  put,
  get,
  delete: remove,
  head,
  copy,
  getSignedUrl,
}) {
  if (
    typeof put !== 'function' ||
    typeof get !== 'function' ||
    typeof remove !== 'function'
  ) {
    throw new TypeError('put, get, and delete implementations are required')
  }

  return {
    put,
    get,
    delete: remove,
    head,
    copy,
    getSignedUrl,
  }
}

export default createObjectStorageAdapter
export { createObjectStorageAdapter }

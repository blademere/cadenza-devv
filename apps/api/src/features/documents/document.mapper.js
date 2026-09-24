const mapDocument = (document) => {
  if (!document) return null

  return {
    ...document,
    sizeBytes:
      typeof document.sizeBytes === 'bigint'
        ? document.sizeBytes.toString()
        : document.sizeBytes,
  }
}

export { mapDocument }

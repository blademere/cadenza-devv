class SearchProviderError extends Error {
  constructor(message, options = {}) { super(message); this.name='SearchProviderError'; this.cause=options.cause; this.code=options.code || 'SEARCH_PROVIDER_ERROR' }
}
export { SearchProviderError }

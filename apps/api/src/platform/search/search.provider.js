import { SearchProviderError } from './search.errors.js'

const assertSearchProvider = (provider) => { if (!provider || typeof provider.search !== 'function') throw new TypeError('A search provider must expose an async search(params) function.'); return provider }
const normalizeResult = (result) => { if(!result||typeof result!=='object') throw new SearchProviderError('Search provider returned an invalid result.'); const items=Array.isArray(result.items)?result.items:[]; const total=Number.isFinite(Number(result.total))?Math.max(0,Number(result.total)):items.length; return {items,total,page:result.page??null,limit:result.limit??null,facets:result.facets||{},meta:result.meta||{}} }
const createSearchProvider = (provider) => { assertSearchProvider(provider); return { async search(params={}) { try { return normalizeResult(await provider.search(params)) } catch(error) { if(error instanceof SearchProviderError) throw error; throw new SearchProviderError('Search provider failed.',{cause:error}) } } } }
export { assertSearchProvider, normalizeResult, createSearchProvider }

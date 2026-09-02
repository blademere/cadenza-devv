import { normalizePagination } from '../../common/pagination/pagination.js'
import { createSearchProvider } from './search.provider.js'

const normalizeSearchRequest = ({query='',filters={},sort=[],pagination={}}={}) => ({ query:typeof query==='string'?query.trim():'', filters:filters&&typeof filters==='object'?filters:{}, sort:Array.isArray(sort)?sort:[], pagination:normalizePagination(pagination) })
const createSearchService = ({provider}) => { const searchProvider=createSearchProvider(provider); return { async search(params={}) { const normalized=normalizeSearchRequest(params); const result=await searchProvider.search(normalized); return {...result,page:result.page??normalized.pagination.page,limit:result.limit??normalized.pagination.limit} } } }
export { normalizeSearchRequest, createSearchService }

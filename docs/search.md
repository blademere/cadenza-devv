# Generic Search Abstraction

The template provides a provider-agnostic search service for application features that need a common search contract without committing the foundation to a specific search engine.

## Contract

A provider implements:

```js
const provider = {
  async search({ query, filters, sort, pagination }) {
    return {
      items: [],
      total: 0,
      facets: {},
      meta: {},
    }
  },
}
```

The generic service normalizes the request into:

```js
{
  query,
  filters,
  sort,
  pagination: {
    page,
    limit,
    skip,
    take,
  },
}
```

and normalizes the result into:

```js
{
  items,
  total,
  page,
  limit,
  facets,
  meta,
}
```

## Usage

```js
const { createSearchService } = require('../../platform/search/search.service')

const search = createSearchService({
  provider: postgresSearchProvider,
})

const results = await search.search({
  query: req.query.q,
  filters: { status: 'ACTIVE' },
  sort: [{ field: 'createdAt', direction: 'desc' }],
  pagination: { page: req.query.page, limit: req.query.limit },
})
```

## Provider strategy

The application owns the actual provider implementation. It can use PostgreSQL `ILIKE`, PostgreSQL full-text search, trigram matching, Elasticsearch, OpenSearch, Meilisearch, or another engine without changing the platform service contract.

The foundation intentionally does not ship a database-specific search implementation.

import { describe, expect, it } from 'vitest'
import {
  permitTypeFormQueryKey,
  permitTypesQueryKey,
  planPermitApplicationQueryKey,
  planPermitApplicationsQueryKey,
} from '../../../../src/features/plan-permits/queries/plan-permits.queries.js'

describe('plan permit query keys', () => {
  it('uses stable collection keys', () => {
    expect(planPermitApplicationsQueryKey).toEqual(['obo', 'plan-permits', 'applications'])
    expect(permitTypesQueryKey).toEqual(['obo', 'plan-permits', 'permit-types'])
  })

  it('scopes application detail keys by application id', () => {
    expect(planPermitApplicationQueryKey('app-123')).toEqual([
      'obo',
      'plan-permits',
      'applications',
      'app-123',
    ])
  })

  it('separates latest and exact permit form versions', () => {
    expect(permitTypeFormQueryKey('permit-123')).toEqual([
      'obo',
      'plan-permits',
      'permit-types',
      'permit-123',
      'form',
      'latest',
    ])
    expect(permitTypeFormQueryKey('permit-123', 3)).toEqual([
      'obo',
      'plan-permits',
      'permit-types',
      'permit-123',
      'form',
      3,
    ])
  })
})

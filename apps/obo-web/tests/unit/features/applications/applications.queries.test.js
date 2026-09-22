import { describe, expect, it } from 'vitest'
import {
  permitTypeFormQueryKey,
  permitTypesQueryKey,
  applicationQueryKey,
  applicationsQueryKey,
} from '../../../../src/features/applications/queries/applications.queries.js'

describe('application query keys', () => {
  it('uses stable collection keys', () => {
    expect(applicationsQueryKey).toEqual(['obo', 'applications', 'applications'])
    expect(permitTypesQueryKey).toEqual(['obo', 'applications', 'permit-types'])
  })

  it('scopes application detail keys by application id', () => {
    expect(applicationQueryKey('app-123')).toEqual([
      'obo',
      'applications',
      'applications',
      'app-123',
    ])
  })

  it('separates latest and exact permit form versions', () => {
    expect(permitTypeFormQueryKey('permit-123')).toEqual([
      'obo',
      'applications',
      'permit-types',
      'permit-123',
      'form',
      'latest',
    ])
    expect(permitTypeFormQueryKey('permit-123', 3)).toEqual([
      'obo',
      'applications',
      'permit-types',
      'permit-123',
      'form',
      3,
    ])
  })
})

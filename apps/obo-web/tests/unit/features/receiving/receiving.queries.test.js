import { describe, expect, it } from 'vitest'
import {
  receivingApplicationQueryKey,
  receivingApplicationsQueryKey,
} from '../../../../src/features/receiving/queries/receiving.queries.js'

describe('receiving query keys', () => {
  it('defaults the receiving queue key to scheduled submissions', () => {
    expect(receivingApplicationsQueryKey()).toEqual([
      'obo',
      'receiving',
      'applications',
      'SUBMISSION_SCHEDULED',
    ])
  })

  it('keeps queue status in the query key', () => {
    expect(receivingApplicationsQueryKey('RECEIVING')).toEqual([
      'obo',
      'receiving',
      'applications',
      'RECEIVING',
    ])
  })

  it('scopes application details by application id', () => {
    expect(receivingApplicationQueryKey('app-123')).toEqual([
      'obo',
      'receiving',
      'applications',
      'app-123',
    ])
  })
})

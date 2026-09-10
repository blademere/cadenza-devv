import { describe, expect, it } from 'vitest'
import {
  pendingProfessionalsQueryKey,
  professionalMineQueryKey,
  verifiedProfessionalsQueryKey,
} from '../../../../src/features/professionals/queries/professionals.queries.js'

describe('professional query keys', () => {
  it('separates verified and pending verification collections', () => {
    expect(verifiedProfessionalsQueryKey).toEqual(['obo', 'professionals', 'verified'])
    expect(pendingProfessionalsQueryKey).toEqual(['obo', 'professionals', 'pending'])
  })

  it('uses a dedicated key for the current professional application', () => {
    expect(professionalMineQueryKey).toEqual(['obo', 'professional-applications', 'mine'])
  })
})

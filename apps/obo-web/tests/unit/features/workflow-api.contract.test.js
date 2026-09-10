import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}

vi.mock('../../../src/services/api/client', () => ({ apiClient }))

const { planPermitsApi } = await import('../../../src/features/plan-permits/api/plan-permits.api.js')
const { professionalsApi } = await import('../../../src/features/professionals/api/professionals.api.js')
const { submissionAppointmentsApi } = await import('../../../src/features/submission-appointments/api/submission-appointments.api.js')
const { receivingApi } = await import('../../../src/features/receiving/api/receiving.api.js')

describe('OBO Web workflow API contracts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the existing Plan Permit application endpoints', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: 'app-1' } })
    apiClient.patch.mockResolvedValueOnce({ data: { id: 'app-1' } })
    apiClient.post.mockResolvedValueOnce({ data: { status: 'READY_FOR_SUBMISSION' } })

    await expect(planPermitsApi.createApplication({ permitTypeId: 'permit-1' })).resolves.toEqual({ id: 'app-1' })
    await expect(planPermitsApi.updateDraft('app-1', { fields: {} })).resolves.toEqual({ id: 'app-1' })
    await expect(planPermitsApi.submitApplication('app-1')).resolves.toEqual({ status: 'READY_FOR_SUBMISSION' })

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/obo/applications', { permitTypeId: 'permit-1' })
    expect(apiClient.patch).toHaveBeenCalledWith('/obo/applications/app-1', { fields: {} })
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/obo/applications/app-1/submit', {})
  })

  it('uses the professional verification and review endpoints', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'professional-1' } })

    await professionalsApi.applyVerification({ registrationNumber: 'REG-1', prcId: 'PRC-1', ptrNumber: 'PTR-1' })
    await professionalsApi.decideVerification('professional-1', 'ACCEPTED')
    await professionalsApi.decideVerification('professional-1', 'DECLINED', 'Invalid PRC ID')

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/obo/professionals/applications', {
      registrationNumber: 'REG-1',
      prcId: 'PRC-1',
      ptrNumber: 'PTR-1',
    })
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/obo/professionals/applications/professional-1/decision', {
      decision: 'ACCEPTED',
    })
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/obo/professionals/applications/professional-1/decision', {
      decision: 'DECLINED',
      reason: 'Invalid PRC ID',
    })
  })

  it('requests only open appointment slots from the platform API', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [{ id: 'slot-1' }] })

    await expect(submissionAppointmentsApi.listAvailableSlots({
      appointmentTypeId: 'type-1',
      from: '2026-09-05T00:00:00Z',
      to: '2026-09-06T00:00:00Z',
    })).resolves.toEqual([{ id: 'slot-1' }])

    expect(apiClient.get).toHaveBeenCalledWith(
      '/appointments/slots?appointmentTypeId=type-1&from=2026-09-05T00%3A00%3A00Z&to=2026-09-06T00%3A00%3A00Z&status=OPEN',
    )
  })

  it('uses the OBO submission appointment endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: 'appointment-1' } })

    await expect(submissionAppointmentsApi.createApplicationAppointment('app-1', {
      appointmentSlotId: 'slot-1',
      notes: 'Hardcopy submission',
    })).resolves.toEqual({ id: 'appointment-1' })

    expect(apiClient.post).toHaveBeenCalledWith('/obo/applications/app-1/submission-appointments', {
      appointmentSlotId: 'slot-1',
      notes: 'Hardcopy submission',
    })
  })

  it('uses the receiving receive and decision endpoints', async () => {
    apiClient.post.mockResolvedValue({ data: { status: 'ok' } })

    await receivingApi.receiveApplication('app-1')
    await receivingApi.decideApplication('app-1', 'ACCEPTED')
    await receivingApi.decideApplication('app-2', 'DECLINED', 'Incomplete hardcopy documents')

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/obo/receiving/applications/app-1/receive', {})
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/obo/receiving/applications/app-1/decision', {
      decision: 'ACCEPTED',
    })
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/obo/receiving/applications/app-2/decision', {
      decision: 'DECLINED',
      reason: 'Incomplete hardcopy documents',
    })
  })
})

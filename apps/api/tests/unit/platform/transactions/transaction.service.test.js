import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPrismaClient = vi.fn()

vi.mock('../../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient,
}))

const db = { $transaction: vi.fn() }
getPrismaClient.mockReturnValue(db)

const { run } = await import('../../../../src/platform/transactions/transaction.service.js')

describe('transaction service', () => {
  beforeEach(() => {
    db.$transaction.mockReset()
  })

  it('runs transactions at serializable isolation', async () => {
    const callback = vi.fn()
    db.$transaction.mockResolvedValue('result')

    await expect(run(callback)).resolves.toBe('result')

    expect(db.$transaction).toHaveBeenCalledWith(callback, {
      isolationLevel: 'Serializable',
    })
  })

  it('retries serialization conflicts and succeeds', async () => {
    const callback = vi.fn()
    const conflict = Object.assign(new Error('serialization conflict'), { code: 'P2034' })
    db.$transaction
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce('result')

    await expect(run(callback)).resolves.toBe('result')
    expect(db.$transaction).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-serialization failures', async () => {
    const callback = vi.fn()
    const error = Object.assign(new Error('failure'), { code: 'P2002' })
    db.$transaction.mockRejectedValue(error)

    await expect(run(callback)).rejects.toBe(error)
    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })
})

import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'

const read = (path) => fs.readFile(new URL(path, import.meta.url), 'utf8')

describe('platform payments architecture', () => {
  it('keeps payment mechanism in platform and provider adapters in infrastructure', async () => {
    const service = await read('../../../../src/platform/payments/payment.service.js')
    const repository = await read('../../../../src/platform/payments/payment.repository.js')
    const provider = await read('../../../../src/infrastructure/payments/payment-provider.js')
    const schema = await read('../../../../prisma/platform/payments.prisma')

    expect(service).toContain('PaymentObligation')
    expect(service).toContain('enqueueEvent')
    expect(service).toContain('recordAudit')
    expect(service).toContain('appId')
    expect(repository).toContain('appId')
    expect(schema).toContain('appId         String')
    expect(schema).toContain('@@unique([appId, referenceType, referenceId])')
    expect(service).not.toContain('/apps/obo/')
    expect(provider).not.toContain('/apps/obo/')
  })
})

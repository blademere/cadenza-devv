import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/lessons/lesson.repository.js', () => ({
  withTransaction: vi.fn(),
  findStudent: vi.fn(),
  findPackage: vi.fn(),
  createEnrollment: vi.fn(),
  attachPaymentObligation: vi.fn(),
  listPackages: vi.fn(),
  listEnrollments: vi.fn(),
  createPackage: vi.fn(),
}))

vi.mock('../../../src/apps/cadenza/rentals/rental.repository.js', () => ({
  withTransaction: vi.fn(),
  findResource: vi.fn(),
  findInstrumentByResource: vi.fn(),
  findRoomByResource: vi.fn(),
  create: vi.fn(),
  attachPaymentObligation: vi.fn(),
  list: vi.fn(),
}))

vi.mock('../../../src/apps/cadenza/payments/payment.repository.js', () => ({
  confirmEnrollment: vi.fn(),
  findRental: vi.fn(),
  reserveRental: vi.fn(),
}))

vi.mock('../../../src/platform/payments/payment.service.js', () => ({
  createPaymentObligation: vi.fn(),
  recordPayment: vi.fn(),
  getObligation: vi.fn(),
}))

const lessonRepository = await import('../../../src/apps/cadenza/lessons/lesson.repository.js')
const rentalRepository = await import('../../../src/apps/cadenza/rentals/rental.repository.js')
const paymentRepository = await import('../../../src/apps/cadenza/payments/payment.repository.js')
const platformPayments = await import('../../../src/platform/payments/payment.service.js')
const lessonService = await import('../../../src/apps/cadenza/lessons/lesson.service.js')
const rentalService = await import('../../../src/apps/cadenza/rentals/rental.service.js')
const paymentService = await import('../../../src/apps/cadenza/payments/payment.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const PACKAGE_ID = '550e8400-e29b-41d4-a716-446655440002'
const RENTAL_ID = '550e8400-e29b-41d4-a716-446655440003'
const RESOURCE_ID = '550e8400-e29b-41d4-a716-446655440004'
const OBLIGATION_ID = '550e8400-e29b-41d4-a716-446655440005'

describe('Cadenza lesson payment workflow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a full-payment obligation when a student enrolls', async () => {
    lessonRepository.findStudent.mockResolvedValue({ id: STUDENT_ID, appId: APP_ID, status: 'ACTIVE' })
    lessonRepository.findPackage.mockResolvedValue({ id: PACKAGE_ID, appId: APP_ID, price: '1500.00', status: 'ACTIVE' })
    lessonRepository.withTransaction.mockImplementation((callback) => callback({}))
    lessonRepository.createEnrollment.mockResolvedValue({ id: 'enrollment-1' })
    platformPayments.createPaymentObligation.mockResolvedValue({ id: OBLIGATION_ID, status: 'UNPAID' })
    lessonRepository.attachPaymentObligation.mockResolvedValue({ id: 'enrollment-1', paymentObligationId: OBLIGATION_ID })

    await lessonService.enroll({ appId: APP_ID, studentId: STUDENT_ID, lessonPackageId: PACKAGE_ID })

    expect(platformPayments.createPaymentObligation).toHaveBeenCalledWith(expect.objectContaining({
      appId: APP_ID,
      referenceType: 'CADENZA_ENROLLMENT',
      referenceId: 'enrollment-1',
      totalAmount: '1500.00',
      currency: 'PHP',
      metadata: { requirement: 'FULL_PAYMENT' },
    }))
    expect(lessonRepository.attachPaymentObligation).toHaveBeenCalledWith(
      'enrollment-1',
      APP_ID,
      OBLIGATION_ID,
      expect.anything(),
    )
  })
})

describe('Cadenza rental payment workflow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a rental obligation carrying the required down payment', async () => {
    rentalRepository.findResource.mockResolvedValue({ id: RESOURCE_ID, appId: APP_ID, type: 'CADENZA_INSTRUMENT' })
    rentalRepository.findInstrumentByResource.mockResolvedValue({ id: 'instrument-1', resourceId: RESOURCE_ID, status: 'AVAILABLE' })
    rentalRepository.withTransaction.mockImplementation((callback) => callback({}))
    rentalRepository.create.mockResolvedValue({ id: RENTAL_ID })
    platformPayments.createPaymentObligation.mockResolvedValue({ id: OBLIGATION_ID, status: 'UNPAID' })
    rentalRepository.attachPaymentObligation.mockResolvedValue({ id: RENTAL_ID, paymentObligationId: OBLIGATION_ID })

    await rentalService.create({
      appId: APP_ID,
      customerUserId: 42,
      resourceId: RESOURCE_ID,
      rentalType: 'INSTRUMENT',
      scheduledStart: '2026-09-20T09:00:00.000Z',
      scheduledEnd: '2026-09-20T12:00:00.000Z',
      totalAmount: '1000.00',
      requiredDownPayment: '300.00',
    })

    expect(platformPayments.createPaymentObligation).toHaveBeenCalledWith(expect.objectContaining({
      appId: APP_ID,
      referenceType: 'CADENZA_RENTAL',
      referenceId: RENTAL_ID,
      totalAmount: '1000.00',
      currency: 'PHP',
      metadata: { requiredDownPayment: '300' },
    }))
  })
})

describe('Cadenza payment settlement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('confirms an enrollment only after full payment', async () => {
    platformPayments.recordPayment.mockResolvedValue({ id: 'payment-1', amount: '1500.00' })
    platformPayments.getObligation.mockResolvedValue({
      id: OBLIGATION_ID,
      appId: APP_ID,
      referenceType: 'CADENZA_ENROLLMENT',
      referenceId: 'enrollment-1',
      status: 'PAID',
    })

    await paymentService.pay({
      appId: APP_ID,
      obligationId: OBLIGATION_ID,
      amount: '1500.00',
      currency: 'PHP',
      method: 'CASH',
      idempotencyKey: 'payment-key-1',
    })

    expect(paymentRepository.confirmEnrollment).toHaveBeenCalledWith('enrollment-1', APP_ID)
  })

  it('reserves a rental when successful payments reach the required down payment', async () => {
    platformPayments.recordPayment.mockResolvedValue({ id: 'payment-2', amount: '300.00' })
    platformPayments.getObligation.mockResolvedValue({
      id: OBLIGATION_ID,
      appId: APP_ID,
      referenceType: 'CADENZA_RENTAL',
      referenceId: RENTAL_ID,
      status: 'PARTIALLY_PAID',
      paidAmount: { gte: vi.fn(() => true) },
    })
    paymentRepository.findRental.mockResolvedValue({
      id: RENTAL_ID,
      appId: APP_ID,
      requiredDownPayment: { toString: () => '300.00' },
    })

    await paymentService.pay({
      appId: APP_ID,
      obligationId: OBLIGATION_ID,
      amount: '300.00',
      currency: 'PHP',
      method: 'CASH',
      idempotencyKey: 'payment-key-2',
    })

    expect(paymentRepository.reserveRental).toHaveBeenCalledWith(RENTAL_ID, APP_ID)
  })
})

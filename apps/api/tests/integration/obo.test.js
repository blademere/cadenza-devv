import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import crypto from 'node:crypto'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-key-minimum-32-characters'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-minimum-32-characters'
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
process.env.COOKIE_SECURE = 'false'
process.env.COOKIE_SAME_SITE = 'lax'

const mocks = vi.hoisted(() => ({
  findUserAuthState: vi.fn(),
  can: vi.fn(),
  getAuthorizationContext: vi.fn(),
}))

vi.mock('../../../src/features/auth/auth.repository.js', () => ({
  findUserAuthState: mocks.findUserAuthState,
}))

vi.mock('../../../src/platform/authorization/access-control.service.js', () => ({
  can: mocks.can,
  canAny: vi.fn(),
  canOwn: vi.fn(),
  getAuthorizationContext: mocks.getAuthorizationContext,
  getRoleById: vi.fn(),
}))

const { getPrismaClient } = await import('../../../src/infrastructure/database/prisma.js')
const { createAccessToken } = await import('../../../src/features/auth/auth.tokens.js')
const { seedPlatformForms } = await import('../../../scripts/seed/platform-forms.js')
const { seedOboReferenceData } = await import('../../../scripts/seed/obo-reference.js')
const { seedOboWorkflow } = await import('../../../scripts/seed/obo-development.js')
const { default: app } = await import('../../../src/app.js')

const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

const unique = (prefix) => `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

const formValuesFor = (professionalId) => ({
  projectName: unique('Integration Building'),
  projectType: 'RESIDENTIAL',
  address: 'Integration Test Site',
  occupancyClassification: 'RESIDENTIAL',
  floorAreaSqm: 120,
  storeys: 2,
  scopeOfWork: 'New residential building',
  estimatedCost: 250000,
  architect: professionalId,
})

describeIfEnabled('OBO shared-feature API integration', () => {
  let clientUser
  let clientPerson
  let receivingOfficer
  let professional
  let permitType
  let formVersion
  let appointmentType
  const requirementIds = []
  const createdApplicationIds = []
  const createdCaseIds = []
  const createdSlotIds = []
  const createdAppointmentIds = []
  const createdWorkflowInstanceIds = []
  const createdDocumentIds = []
  const createdUserIds = []
  const createdPersonIds = []
  const createdProfessionalIds = []
  const createdRequirementIds = []
  const createdMappingIds = []
  const createdEventEntityIds = new Set()

  const clientToken = () => createAccessToken({ id: clientUser.id, authVersion: clientUser.authVersion })
  const receivingToken = () => createAccessToken({ id: receivingOfficer.id, authVersion: receivingOfficer.authVersion })
  const auth = (token) => ({ Authorization: `Bearer ${token}` })
  const idempotencyKey = (scope) => `${scope}-${crypto.randomUUID()}`

  const createSlot = async () => {
    const startsAt = new Date(Date.now() + 30 * 60 * 1000)
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000)
    const slot = await prisma.appointmentSlot.create({ data: { appointmentTypeId: appointmentType.id, startsAt, endsAt, capacity: 1, status: 'OPEN' } })
    createdSlotIds.push(slot.id)
    return slot
  }

  const createApplication = async (replacesApplicationId = undefined) => {
    const response = await request(app)
      .post('/api/v1/obo/applications')
      .set(auth(clientToken()))
      .set('Idempotency-Key', idempotencyKey('application-create'))
      .send({ permitTypeId: permitType.id, formVersionId: formVersion.id, formValues: formValuesFor(professional.id), ...(replacesApplicationId ? { replacesApplicationId } : {}) })
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toEqual(expect.objectContaining({ caseId: expect.any(String), referenceNumber: expect.stringMatching(/^OBO-\d{8}-[A-F0-9]{8}$/), workflowInstanceId: expect.any(String), status: 'DRAFT' }))
    const application = response.body.data
    createdApplicationIds.push(application.id)
    createdCaseIds.push(application.caseId)
    createdWorkflowInstanceIds.push(application.workflowInstanceId)
    createdEventEntityIds.add(application.id)
    return application
  }

  const submitApplication = async (applicationId) => {
    const response = await request(app).post(`/api/v1/obo/applications/${applicationId}/submit`).set(auth(clientToken())).set('Idempotency-Key', idempotencyKey('application-submit'))
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('READY_FOR_SUBMISSION')
    return response.body.data
  }

  const bookAppointment = async (applicationId) => {
    const slot = await createSlot()
    const response = await request(app).post(`/api/v1/obo/applications/${applicationId}/submission-appointments`).set(auth(clientToken())).set('Idempotency-Key', idempotencyKey('appointment-book')).send({ appointmentTypeId: appointmentType.id, slotId: slot.id, notes: 'Integration test appointment' })
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toEqual(expect.objectContaining({ id: expect.any(String), slot: expect.objectContaining({ id: slot.id }) }))
    createdAppointmentIds.push(response.body.data.id)
    await prisma.appointmentSlot.update({ where: { id: slot.id }, data: { startsAt: new Date(Date.now() - 60 * 1000), endsAt: new Date(Date.now() + 29 * 60 * 1000) } })
    return response.body.data
  }

  const receiveApplication = async (applicationId) => {
    const response = await request(app).post(`/api/v1/obo/receiving/applications/${applicationId}/receive`).set(auth(receivingToken())).set('Idempotency-Key', idempotencyKey('application-receive'))
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('RECEIVING')
    return response.body.data
  }

  const getChecklist = async (applicationId) => {
    const response = await request(app).get(`/api/v1/obo/receiving/applications/${applicationId}/documents`).set(auth(receivingToken()))
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.length).toBeGreaterThan(0)
    return response.body.data
  }

  const attachAndVerifyDocuments = async (applicationId) => {
    const checklist = await getChecklist(applicationId)
    for (const item of checklist) {
      const document = await prisma.document.create({ data: { ownerId: receivingOfficer.id, originalName: `${item.requirement.name.replaceAll(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.pdf`, storageKey: unique('obo-integration-document'), mimeType: 'application/pdf', sizeBytes: BigInt(1024), checksumSha256: crypto.createHash('sha256').update(crypto.randomUUID()).digest('hex') } })
      createdDocumentIds.push(document.id)
      const received = await request(app).patch(`/api/v1/obo/receiving/applications/${applicationId}/documents/${item.caseRequirementId}`).set(auth(receivingToken())).set('Idempotency-Key', idempotencyKey('document-receive')).send({ status: 'RECEIVED', documentId: document.id })
      expect(received.status).toBe(200)
      expect(received.body.success).toBe(true)
      expect(received.body.data.status).toBe('RECEIVED')
      const verified = await request(app).patch(`/api/v1/obo/receiving/applications/${applicationId}/documents/${item.caseRequirementId}`).set(auth(receivingToken())).set('Idempotency-Key', idempotencyKey('document-verify')).send({ status: 'VERIFIED' })
      expect(verified.status).toBe(200)
      expect(verified.body.success).toBe(true)
      expect(verified.body.data.status).toBe('VERIFIED')
    }
  }

  const decide = async (applicationId, decision, reason) => {
    const response = await request(app).post(`/api/v1/obo/receiving/applications/${applicationId}/decision`).set(auth(receivingToken())).set('Idempotency-Key', idempotencyKey('application-decision')).send({ decision, ...(reason ? { reason } : {}) })
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    return response.body.data
  }

  beforeAll(async () => {
    await prisma.$connect()
    await seedPlatformForms(prisma)
    const referenceData = await seedOboReferenceData(prisma, { planPermitForm: await prisma.form.findUnique({ where: { key: 'obo-building-plan-permit' } }) })
    permitType = referenceData.permitType
    appointmentType = referenceData.appointmentType
    await seedOboWorkflow(prisma)
    formVersion = await prisma.formVersion.findUnique({ where: { formId_version: { formId: permitType.formId, version: 1 } } })
    expect(formVersion).toBeTruthy()

    const role = await prisma.role.create({ data: { name: unique('obo-api-integration-role') } })
    clientUser = await prisma.user.create({ data: { email: `${unique('obo-api-client')}@example.test`, roleId: role.id, isActive: true } })
    receivingOfficer = await prisma.user.create({ data: { email: `${unique('obo-api-receiving')}@example.test`, roleId: role.id, isActive: true } })
    const professionalUser = await prisma.user.create({ data: { email: `${unique('obo-api-professional')}@example.test`, roleId: role.id, isActive: true } })
    createdUserIds.push(clientUser.id, receivingOfficer.id, professionalUser.id)
    clientPerson = await prisma.person.create({ data: { userId: clientUser.id, firstName: 'Integration', lastName: 'Client', email: clientUser.email } })
    const professionalPerson = await prisma.person.create({ data: { userId: professionalUser.id, firstName: 'Integration', lastName: 'Professional', email: professionalUser.email } })
    createdPersonIds.push(clientPerson.id, professionalPerson.id)
    professional = await prisma.oboProfessional.create({ data: { personId: professionalPerson.id, userId: professionalUser.id, registrationNumber: unique('PRO-TEST'), prcId: unique('PRC-TEST'), ptrNumber: unique('PTR-TEST'), professionalRole: 'ARCHITECT', status: 'VERIFIED', verifiedByUserId: receivingOfficer.id, verifiedAt: new Date(), verificationReason: 'Integration fixture' } })
    createdProfessionalIds.push(professional.id)

    const requirementDefinitions = await Promise.all([
      prisma.requirementDefinition.create({ data: { key: unique('obo-integration-building-plan'), name: 'Building Plan', metadata: { required: true } } }),
      prisma.requirementDefinition.create({ data: { key: unique('obo-integration-site-plan'), name: 'Site Development Plan', metadata: { required: true } } }),
      prisma.requirementDefinition.create({ data: { key: unique('obo-integration-credentials'), name: 'Professional Credentials', metadata: { required: true } } }),
    ])
    createdRequirementIds.push(...requirementDefinitions.map((item) => item.id))
    requirementIds.push(...requirementDefinitions.map((item) => item.id))
    const mappings = await prisma.oboPermitTypeRequirement.createManyAndReturn({ data: requirementDefinitions.map((requirement) => ({ permitTypeId: permitType.id, requirementId: requirement.id })) })
    createdMappingIds.push(...mappings.map((item) => item.id))
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUserAuthState.mockImplementation(async (userId) => ({ id: Number(userId), isActive: true, authVersion: 0 }))
    mocks.can.mockResolvedValue(true)
    mocks.getAuthorizationContext.mockResolvedValue({ role: { id: clientUser.roleId, name: 'integration' }, permissions: new Set() })
  })

  afterAll(async () => {
    if (createdEventEntityIds.size) {
      await prisma.eventOutbox.deleteMany({ where: { entityType: 'OboPermitApplication', entityId: { in: [...createdEventEntityIds] } } })
      await prisma.auditLog.deleteMany({ where: { entityType: { in: ['OboPermitApplication', 'OboPermitApplicationDocument'] }, entityId: { in: [...createdEventEntityIds] } } })
    }
    if (createdDocumentIds.length) await prisma.document.deleteMany({ where: { id: { in: createdDocumentIds } } })
    if (createdAppointmentIds.length) await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } })
    if (createdApplicationIds.length) await prisma.oboPermitApplication.deleteMany({ where: { id: { in: createdApplicationIds } } })
    if (createdWorkflowInstanceIds.length) await prisma.workflowInstance.deleteMany({ where: { id: { in: createdWorkflowInstanceIds } } })
    if (createdCaseIds.length) await prisma.caseRecord.deleteMany({ where: { id: { in: createdCaseIds } } })
    if (createdSlotIds.length) await prisma.appointment.deleteMany({ where: { slotId: { in: createdSlotIds } } })
    if (createdSlotIds.length) await prisma.appointmentSlot.deleteMany({ where: { id: { in: createdSlotIds } } })
    if (createdProfessionalIds.length) await prisma.oboProfessional.deleteMany({ where: { id: { in: createdProfessionalIds } } })
    if (createdPersonIds.length) await prisma.person.deleteMany({ where: { id: { in: createdPersonIds } } })
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    if (createdMappingIds.length) await prisma.oboPermitTypeRequirement.deleteMany({ where: { id: { in: createdMappingIds } } })
    if (createdRequirementIds.length) await prisma.requirementDefinition.deleteMany({ where: { id: { in: createdRequirementIds } } })
    await prisma.$disconnect()
  })

  it('composes cases, participants, requirements, appointments, documents, tasks, and workflow through the API', async () => {
    const application = await createApplication()
    await submitApplication(application.id)
    await bookAppointment(application.id)
    await receiveApplication(application.id)
    await attachAndVerifyDocuments(application.id)
    const decision = await decide(application.id, 'ACCEPT', undefined)
    expect(decision.status).toBe('APPROVED')
  })

  it('supports decline and replacement application through the same API boundary', async () => {
    const application = await createApplication()
    await submitApplication(application.id)
    await bookAppointment(application.id)
    await receiveApplication(application.id)
    await attachAndVerifyDocuments(application.id)
    const declined = await decide(application.id, 'DECLINE', 'Missing supporting information')
    expect(declined.status).toBe('DECLINED')
    const replacement = await createApplication(application.id)
    expect(replacement.replacesApplicationId).toBe(application.id)
  })

  it('registers, auto-generates a professional number, and supports receiving-officer verification', async () => {
    const response = await request(app).post('/api/v1/obo/professionals').set(auth(clientToken())).set('Idempotency-Key', idempotencyKey('professional-create')).send({ firstName: 'New', lastName: 'Professional', email: `${unique('new-professional')}@example.test`, professionalRole: 'ARCHITECT' })
    expect(response.status).toBe(201)
    expect(response.body.data.registrationNumber).toMatch(/^PRO-[A-Z0-9-]+$/)
    const professionalId = response.body.data.id
    const verify = await request(app).post(`/api/v1/obo/professionals/${professionalId}/verify`).set(auth(receivingToken())).set('Idempotency-Key', idempotencyKey('professional-verify')).send({ reason: 'Verified during integration test' })
    expect(verify.status).toBe(200)
    expect(verify.body.data.status).toBe('VERIFIED')
  })
})
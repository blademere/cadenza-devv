const OBO_WORKFLOW = {
  key: 'obo_plan_permit',
  name: 'OBO Plan Permit Application',
  description: 'Lifecycle workflow for an OBO plan permit application.',
  steps: [
    { key: 'DRAFT', name: 'Draft', isInitial: true, isFinal: false, sortOrder: 0 },
    { key: 'READY_FOR_SUBMISSION', name: 'Ready for Submission', isInitial: false, isFinal: false, sortOrder: 1 },
    { key: 'SUBMISSION_SCHEDULED', name: 'Submission Scheduled', isInitial: false, isFinal: false, sortOrder: 2 },
    { key: 'RECEIVING', name: 'Receiving', isInitial: false, isFinal: false, sortOrder: 3 },
    { key: 'DECLINED', name: 'Declined', isInitial: false, isFinal: true, sortOrder: 4 },
    { key: 'FOR_INSPECTION', name: 'For Inspection', isInitial: false, isFinal: true, sortOrder: 5 },
  ],
  transitions: [
    { key: 'SUBMIT_FOR_SUBMISSION', name: 'Submit for Submission', fromStepKey: 'DRAFT', toStepKey: 'READY_FOR_SUBMISSION', permissionKey: 'obo_plan_permits:submit' },
    { key: 'SCHEDULE_SUBMISSION', name: 'Schedule Hardcopy Submission', fromStepKey: 'READY_FOR_SUBMISSION', toStepKey: 'SUBMISSION_SCHEDULED', permissionKey: 'obo_plan_permits:schedule_submission' },
    { key: 'RECEIVE_HARDCOPY', name: 'Receive Hardcopy', fromStepKey: 'SUBMISSION_SCHEDULED', toStepKey: 'RECEIVING', permissionKey: 'obo_plan_permits:receive' },
    { key: 'DECLINE', name: 'Decline Application', fromStepKey: 'RECEIVING', toStepKey: 'DECLINED', permissionKey: 'obo_plan_permits:receive' },
    { key: 'ACCEPT_FOR_INSPECTION', name: 'Accept for Inspection', fromStepKey: 'RECEIVING', toStepKey: 'FOR_INSPECTION', permissionKey: 'obo_plan_permits:receive' },
  ],
}

const OBO_DEVELOPMENT_FIXTURE = {
  clientEmail: 'obo-client@example.test',
  professionalEmail: 'obo-professional@example.test',
  receivingOfficerEmail: 'obo-receiving-officer@example.test',
  registrationNumber: 'DEV-OBO-PRC-0001',
  professionalRole: 'ARCHITECT',
  referenceNumber: 'OBO-DEV-20300610-0001',
  appointmentReferenceNumber: 'OBO-APPT-DEV-0001',
  formKey: 'obo-building-plan-permit',
  formVersion: 1,
  professionalFieldKey: 'architect',
}

const ensureUser = async (prisma, { email, roleId, passwordHash }) => prisma.user.upsert({
  where: { email },
  update: { roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  create: { email, roleId, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
})

async function seedOboWorkflow(prisma) {
  const workflow = await prisma.workflow.upsert({
    where: { key: OBO_WORKFLOW.key },
    update: { name: OBO_WORKFLOW.name, description: OBO_WORKFLOW.description, isActive: true },
    create: { key: OBO_WORKFLOW.key, name: OBO_WORKFLOW.name, description: OBO_WORKFLOW.description },
  })
  const version = await prisma.workflowVersion.upsert({
    where: { workflowId_version: { workflowId: workflow.id, version: 1 } },
    update: { status: 'PUBLISHED' },
    create: { workflowId: workflow.id, version: 1, status: 'PUBLISHED' },
  })
  for (const step of OBO_WORKFLOW.steps) {
    await prisma.workflowStep.upsert({
      where: { workflowVersionId_key: { workflowVersionId: version.id, key: step.key } },
      update: { name: step.name, isInitial: step.isInitial, isFinal: step.isFinal, sortOrder: step.sortOrder },
      create: { workflowVersionId: version.id, ...step },
    })
  }
  const steps = await prisma.workflowStep.findMany({ where: { workflowVersionId: version.id } })
  const stepByKey = new Map(steps.map((step) => [step.key, step]))
  for (const transition of OBO_WORKFLOW.transitions) {
    const fromStep = stepByKey.get(transition.fromStepKey)
    const toStep = stepByKey.get(transition.toStepKey)
    if (!fromStep || !toStep) throw new Error(`OBO workflow transition '${transition.key}' references an unknown step.`)
    await prisma.workflowTransition.upsert({
      where: { workflowVersionId_key: { workflowVersionId: version.id, key: transition.key } },
      update: { fromStepId: fromStep.id, toStepId: toStep.id, name: transition.name, permissionKey: transition.permissionKey },
      create: { workflowVersionId: version.id, fromStepId: fromStep.id, fromStepId: fromStep.id, toStepId: toStep.id, key: transition.key, name: transition.name, permissionKey: transition.permissionKey },
    })
  }
  return { workflow, version, steps: stepByKey }
}

async function ensureDevelopmentProfessional(prisma, { appId, roles, passwordHash, receivingOfficer, now }) {
  const professionalUser = await ensureUser(prisma, { email: OBO_DEVELOPMENT_FIXTURE.professionalEmail, roleId: roles.professional.id, passwordHash })
  const professionalPerson = await prisma.person.upsert({
    where: { userId: professionalUser.id },
    update: { firstName: 'OBO', lastName: 'Architect', email: professionalUser.email, phone: '+630000000002', isActive: true },
    create: { userId: professionalUser.id, firstName: 'OBO', lastName: 'Architect', email: professionalUser.email, phone: '+630000000002', isActive: true },
  })
  const professional = await prisma.oboProfessional.upsert({
    where: { appId_registrationNumber: { appId, registrationNumber: OBO_DEVELOPMENT_FIXTURE.registrationNumber } },
    update: {
      personId: professionalPerson.id,
      prcId: 'DEV-PRC-0001',
      ptrNumber: 'DEV-PTR-0001',
      professionalRole: OBO_DEVELOPMENT_FIXTURE.professionalRole,
      status: 'VERIFIED',
      verifiedByUserId: receivingOfficer.id,
      verifiedAt: now,
      verificationReason: 'Development seed verification',
    },
    create: {
      appId,
      personId: professionalPerson.id,
      registrationNumber: OBO_DEVELOPMENT_FIXTURE.registrationNumber,
      prcId: 'DEV-PRC-0001',
      ptrNumber: 'DEV-PTR-0001',
      professionalRole: OBO_DEVELOPMENT_FIXTURE.professionalRole,
      status: 'VERIFIED',
      verifiedByUserId: receivingOfficer.id,
      verifiedAt: now,
      verificationReason: 'Development seed verification',
    },
  })
  const decision = await prisma.oboProfessionalVerificationDecision.findFirst({ where: { professionalId: professional.id, decision: 'ACCEPTED' }, orderBy: { decidedAt: 'desc' } })
  if (decision) {
    await prisma.oboProfessionalVerificationDecision.update({ where: { id: decision.id }, data: { reason: 'Development seed verification', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  } else {
    await prisma.oboProfessionalVerificationDecision.create({ data: { professionalId: professional.id, decision: 'ACCEPTED', reason: 'Development seed verification', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  }
  return { professionalUser, professionalPerson, professional }
}

async function seedOboDevelopmentScenario(prisma, { roles, passwordHash = null }) {
  const oboApp = await prisma.app.findUnique({ where: { key: 'obo' }, select: { id: true } })
  if (!oboApp) throw new Error("OBO application 'obo' was not seeded.")
  const appId = oboApp.id
  const { version, steps } = await seedOboWorkflow(prisma)
  const now = new Date('2030-06-10T08:00:00.000Z')
  const appointmentStart = new Date('2030-06-14T09:00:00.000Z')
  const appointmentEnd = new Date('2030-06-14T09:30:00.000Z')
  const clientUser = await ensureUser(prisma, { email: OBO_DEVELOPMENT_FIXTURE.clientEmail, roleId: roles.client.id, passwordHash })
  const receivingOfficer = await ensureUser(prisma, { email: OBO_DEVELOPMENT_FIXTURE.receivingOfficerEmail, roleId: roles.receiving_officer.id, passwordHash })
  const { professionalUser, professionalPerson, professional } = await ensureDevelopmentProfessional(prisma, { appId, roles, passwordHash, receivingOfficer, now })

  const clientPerson = await prisma.person.upsert({
    where: { userId: clientUser.id },
    update: { firstName: 'OBO', lastName: 'Client', email: clientUser.email, phone: '+630000000001', isActive: true },
    create: { userId: clientUser.id, firstName: 'OBO', lastName: 'Client', email: clientUser.email, phone: '+630000000001' },
  })

  const form = await prisma.form.findUnique({ where: { appId_key: { appId, key: OBO_DEVELOPMENT_FIXTURE.formKey } } })
  if (!form) throw new Error(`OBO development form '${OBO_DEVELOPMENT_FIXTURE.formKey}' was not seeded.`)
  const formVersion = await prisma.formVersion.findUnique({ where: { formId_version: { formId: form.id, version: OBO_DEVELOPMENT_FIXTURE.formVersion } }, include: { fields: true } })
  if (!formVersion || formVersion.status !== 'PUBLISHED') throw new Error(`Published OBO development form '${OBO_DEVELOPMENT_FIXTURE.formKey}' v${OBO_DEVELOPMENT_FIXTURE.formVersion} was not seeded.`)
  const professionalField = formVersion.fields.find((field) => field.key === OBO_DEVELOPMENT_FIXTURE.professionalFieldKey)
  if (!professionalField || professionalField.type !== 'reference' || professionalField.config?.referenceType !== 'obo_professional') throw new Error(`OBO development form must define '${OBO_DEVELOPMENT_FIXTURE.professionalFieldKey}' as an OBO professional reference.`)
  if (professionalField.config?.professionalRole !== OBO_DEVELOPMENT_FIXTURE.professionalRole) throw new Error(`OBO development professional field role must be '${OBO_DEVELOPMENT_FIXTURE.professionalRole}'.`)

  const permitType = await prisma.oboPermitType.findUnique({ where: { appId_key: { appId, key: 'building-plan-permit' } } })
  if (!permitType) throw new Error("OBO reference fixture 'building-plan-permit' was not seeded.")
  const caseType = await prisma.caseType.upsert({
    where: { key: 'obo-permit-application' },
    update: { name: 'OBO Permit Application', isActive: true },
    create: { key: 'obo-permit-application', name: 'OBO Permit Application', description: 'OBO permit application lifecycle' },
  })
  const referenceNumber = OBO_DEVELOPMENT_FIXTURE.referenceNumber
  const caseRecord = await prisma.caseRecord.upsert({
    where: { appId_caseNumber: { appId, caseNumber: referenceNumber } },
    update: { caseTypeId: caseType.id, title: `${permitType.name} Application`, status: 'OPEN', createdByUserId: clientUser.id },
    create: { appId, caseNumber: referenceNumber, caseTypeId: caseType.id, title: `${permitType.name} Application`, status: 'OPEN', createdByUserId: clientUser.id, openedAt: now },
  })

  const formValues = {
    projectName: 'Development Seed Building',
    projectType: 'RESIDENTIAL',
    address: 'Development Test Site',
    occupancyClassification: 'RESIDENTIAL',
    floorAreaSqm: 120,
    storeys: 2,
    scopeOfWork: 'New residential building',
    estimatedCost: 250000,
    [OBO_DEVELOPMENT_FIXTURE.professionalFieldKey]: professional.id,
  }
  const professionalSnapshots = {
    [OBO_DEVELOPMENT_FIXTURE.professionalFieldKey]: {
      professionalId: professional.id,
      name: [professionalPerson.firstName, professionalPerson.lastName].filter(Boolean).join(' '),
      registrationNumber: professional.registrationNumber,
      prcId: professional.prcId,
      ptrNumber: professional.ptrNumber,
      role: professional.professionalRole,
    },
  }

  const existingApplication = await prisma.oboPermitApplication.findUnique({ where: { appId_referenceNumber: { appId, referenceNumber } }, select: { workflowInstanceId: true } })
  let workflowInstance
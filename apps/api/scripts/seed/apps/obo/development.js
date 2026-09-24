import { seedOboWorkflow } from './workflow.js'

const OBO_DEVELOPMENT_FIXTURE = {
  clientEmail: 'obo-client@example.test',
  professionalEmail: 'obo-professional@example.test',
  receivingOfficerEmail: 'obo-receiving-officer@example.test',
  registrationNumber: 'DEV-OBO-PRC-0001',
  professionalRole: 'ARCHITECT',
  referenceNumber: 'OBO-DEV-20300610-0001',
  appointmentReferenceNumber: 'OBO-APPT-DEV-0001',
  formKey: 'obo-building-permit',
  formVersion: 1,
  professionalFieldKey: 'architect',
}

const ensureUser = async (prisma, { appId, email, roleId, passwordHash }) => {
  const user = await prisma.user.upsert({
    where: { email },
    update: { isActive: true, ...(passwordHash ? { passwordHash } : {}) },
    create: { email, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  })

  if (roleId) {
    const membership = await prisma.appMembership.upsert({
      where: { appId_userId: { appId, userId: user.id } },
      update: { isActive: true },
      create: { appId, userId: user.id },
    })
    await prisma.appMembershipRole.upsert({
      where: { membershipId_roleId: { membershipId: membership.id, roleId } },
      update: {},
      create: { membershipId: membership.id, roleId },
    })
  }

  return user
}


async function ensureDevelopmentProfessional(prisma, { appId, roles, passwordHash, receivingOfficer, now }) {
  const professionalUser = await ensureUser(prisma, { appId, email: OBO_DEVELOPMENT_FIXTURE.professionalEmail, roleId: roles.professional.id, passwordHash })
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
  const clientUser = await ensureUser(prisma, { appId, email: OBO_DEVELOPMENT_FIXTURE.clientEmail, roleId: roles.client.id, passwordHash })
  const receivingOfficer = await ensureUser(prisma, { appId, email: OBO_DEVELOPMENT_FIXTURE.receivingOfficerEmail, roleId: roles.receiving_officer.id, passwordHash })
  const { professionalUser, professionalPerson, professional } = await ensureDevelopmentProfessional(prisma, { appId, roles, passwordHash, receivingOfficer, now })

  const clientPerson = await prisma.person.upsert({
    where: { userId: clientUser.id },
    update: { firstName: 'OBO', lastName: 'Client', email: clientUser.email, phone: '+630000000001', isActive: true },
    create: { userId: clientUser.id, firstName: 'OBO', lastName: 'Client', email: clientUser.email, phone: '+630000000001', isActive: true },
  })

  const form = await prisma.form.findUnique({ where: { appId_key: { appId, key: OBO_DEVELOPMENT_FIXTURE.formKey } } })
  if (!form) throw new Error(`OBO development form '${OBO_DEVELOPMENT_FIXTURE.formKey}' was not seeded.`)
  const formVersion = await prisma.formVersion.findUnique({ where: { formId_version: { formId: form.id, version: OBO_DEVELOPMENT_FIXTURE.formVersion } }, include: { fields: true } })
  if (!formVersion || formVersion.status !== 'PUBLISHED') throw new Error(`Published OBO development form '${OBO_DEVELOPMENT_FIXTURE.formKey}' v${OBO_DEVELOPMENT_FIXTURE.formVersion} was not seeded.`)
  const professionalField = formVersion.fields.find((field) => field.key === OBO_DEVELOPMENT_FIXTURE.professionalFieldKey)
  if (!professionalField || professionalField.type !== 'reference' || professionalField.config?.referenceType !== 'obo_professional') throw new Error(`OBO development form must define '${OBO_DEVELOPMENT_FIXTURE.professionalFieldKey}' as an OBO professional reference.`)
  if (professionalField.config?.professionalRole !== OBO_DEVELOPMENT_FIXTURE.professionalRole) throw new Error(`OBO development professional field role must be '${OBO_DEVELOPMENT_FIXTURE.professionalRole}'.`)

  const permitType = await prisma.oboPermitType.findUnique({ where: { appId_key: { appId, key: 'building-permit' } } })
  if (!permitType) throw new Error("OBO reference fixture 'building-permit' was not seeded.")
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
  if (existingApplication?.workflowInstanceId) {
    workflowInstance = await prisma.workflowInstance.update({ where: { id: existingApplication.workflowInstanceId }, data: { workflowVersionId: version.id, currentStepId: steps.get('FOR_INSPECTION').id, completedAt: now, startedByUserId: clientUser.id } })
  } else {
    workflowInstance = await prisma.workflowInstance.create({ data: { workflowVersionId: version.id, currentStepId: steps.get('FOR_INSPECTION').id, subjectType: 'OboPermitApplication', subjectId: referenceNumber, startedByUserId: clientUser.id, startedAt: now, completedAt: now } })
  }

  const application = await prisma.oboPermitApplication.upsert({
    where: { appId_referenceNumber: { appId, referenceNumber } },
    update: {
      caseId: caseRecord.id,
      permitTypeId: permitType.id,
      clientPersonId: clientPerson.id,
      formVersionId: formVersion.id,
      formValues,
      professionalSnapshots,
      workflowInstanceId: workflowInstance.id,
      submittedAt: now,
      acceptedAt: now,
      acceptedByUserId: receivingOfficer.id,
      declinedAt: null,
      declineReason: null,
    },
    create: {
      appId,
      referenceNumber,
      caseId: caseRecord.id,
      permitTypeId: permitType.id,
      clientPersonId: clientPerson.id,
      formVersionId: formVersion.id,
      formValues,
      professionalSnapshots,
      workflowInstanceId: workflowInstance.id,
      submittedAt: now,
      acceptedAt: now,
      acceptedByUserId: receivingOfficer.id,
    },
  })
  await prisma.workflowInstance.update({ where: { id: workflowInstance.id }, data: { subjectId: application.id } })

  const appointmentType = await prisma.appointmentType.findUnique({ where: { appId_key: { appId, key: 'obo-hardcopy-submission' } } })
  if (!appointmentType) throw new Error("OBO reference fixture 'obo-hardcopy-submission' was not seeded.")
  const slot = await prisma.appointmentSlot.upsert({ where: { appointmentTypeId_startsAt: { appointmentTypeId: appointmentType.id, startsAt: appointmentStart } }, update: { endsAt: appointmentEnd, capacity: 1, bookedCount: 1, status: 'BOOKED' }, create: { appointmentTypeId: appointmentType.id, startsAt: appointmentStart, endsAt: appointmentEnd, capacity: 1, bookedCount: 1, status: 'BOOKED' } })
  const appointment = await prisma.appointment.upsert({ where: { appId_referenceNumber: { appId, referenceNumber: OBO_DEVELOPMENT_FIXTURE.appointmentReferenceNumber } }, update: { appointmentTypeId: appointmentType.id, slotId: slot.id, userId: clientUser.id, status: 'COMPLETED', checkedInAt: appointmentStart, completedAt: appointmentEnd, metadata: { applicationId: application.id, purpose: 'hardcopy_submission' } }, create: { appId, referenceNumber: OBO_DEVELOPMENT_FIXTURE.appointmentReferenceNumber, appointmentTypeId: appointmentType.id, slotId: slot.id, userId: clientUser.id, status: 'COMPLETED', checkedInAt: appointmentStart, completedAt: appointmentEnd, metadata: { applicationId: application.id, purpose: 'hardcopy_submission' } } })
  await prisma.oboSubmissionAppointment.upsert({ where: { applicationId: application.id }, update: { appointmentId: appointment.id }, create: { applicationId: application.id, appointmentId: appointment.id } })

  for (const [fromKey, toKey, transitionKey] of [
    ['DRAFT', 'READY_FOR_SUBMISSION', 'SUBMIT_FOR_SUBMISSION'],
    ['READY_FOR_SUBMISSION', 'SUBMISSION_SCHEDULED', 'SCHEDULE_SUBMISSION'],
    ['SUBMISSION_SCHEDULED', 'RECEIVING', 'RECEIVE_HARDCOPY'],
    ['RECEIVING', 'FOR_INSPECTION', 'ACCEPT_FOR_INSPECTION'],
  ]) {
    const transition = await prisma.workflowTransition.findUnique({ where: { workflowVersionId_key: { workflowVersionId: version.id, key: transitionKey } } })
    if (!transition) throw new Error(`OBO workflow transition '${transitionKey}' was not seeded.`)
    const existing = await prisma.workflowHistory.findFirst({ where: { instanceId: workflowInstance.id, transitionId: transition.id } })
    if (!existing) await prisma.workflowHistory.create({ data: { instanceId: workflowInstance.id, fromStepId: steps.get(fromKey).id, toStepId: steps.get(toKey).id, transitionId: transition.id, actorId: toKey === 'FOR_INSPECTION' || toKey === 'RECEIVING' ? receivingOfficer.id : clientUser.id, createdAt: now } })
  }

  const receivingDecision = await prisma.oboReceivingDecision.findFirst({ where: { applicationId: application.id, decision: 'ACCEPTED' }, orderBy: { decidedAt: 'desc' } })
  if (receivingDecision) await prisma.oboReceivingDecision.update({ where: { id: receivingDecision.id }, data: { reason: 'Development seed hardcopy accepted', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  else await prisma.oboReceivingDecision.create({ data: { applicationId: application.id, decision: 'ACCEPTED', reason: 'Development seed hardcopy accepted', decidedByUserId: receivingOfficer.id, decidedAt: now } })

  console.log(`OBO development scenario ensured: ${referenceNumber}; professional selection is stored in formValues.${OBO_DEVELOPMENT_FIXTURE.professionalFieldKey}.`)
  return { clientUser, professionalUser, receivingOfficer, clientPerson, professional, application, appointment, workflowInstance }
}

const requireCondition = (condition, message) => {
  if (!condition) throw new Error(`OBO seed verification failed: ${message}`)
}

async function verifyOboDevelopmentScenario(prisma) {
  const fixture = OBO_DEVELOPMENT_FIXTURE
  const oboApp = await prisma.app.findUnique({ where: { key: 'obo' }, select: { id: true } })
  if (!oboApp) throw new Error("OBO application 'obo' was not seeded.")
  const application = await prisma.oboPermitApplication.findUnique({ where: { appId_referenceNumber: { appId: oboApp.id, referenceNumber: fixture.referenceNumber } } })
  requireCondition(application, `application '${fixture.referenceNumber}' does not exist.`)
  requireCondition(application.formVersionId, `application '${fixture.referenceNumber}' must have a form version.`)
  requireCondition(application.formValues?.[fixture.professionalFieldKey], `application '${fixture.referenceNumber}' must select a professional through formValues.${fixture.professionalFieldKey}.`)
  requireCondition(application.professionalSnapshots?.[fixture.professionalFieldKey]?.professionalId === application.formValues[fixture.professionalFieldKey], 'professional snapshot must match the selected form reference.')

  const professional = await prisma.oboProfessional.findUnique({ where: { appId_registrationNumber: { appId: oboApp.id, registrationNumber: fixture.registrationNumber } }, select: { id: true, status: true, professionalRole: true, person: { select: { isActive: true } } } })
  requireCondition(professional, `professional '${fixture.registrationNumber}' does not exist.`)
  requireCondition(professional.status === 'VERIFIED', `professional '${fixture.registrationNumber}' must be VERIFIED.`)
  requireCondition(professional.professionalRole === fixture.professionalRole, `professional '${fixture.registrationNumber}' must have role '${fixture.professionalRole}'.`)
  requireCondition(professional.person?.isActive === true, `professional '${fixture.registrationNumber}' must have an active person.`)
  requireCondition(application.formValues[fixture.professionalFieldKey] === professional.id, 'professional form value must reference the seeded professional.')

  const formVersion = await prisma.formVersion.findUnique({ where: { id: application.formVersionId }, include: { fields: true } })
  const field = formVersion?.fields.find((item) => item.key === fixture.professionalFieldKey)
  requireCondition(field?.type === 'reference', `form field '${fixture.professionalFieldKey}' must be a reference field.`)
  requireCondition(field.config?.referenceType === 'obo_professional', `form field '${fixture.professionalFieldKey}' must reference OBO professionals.`)
  requireCondition(field.config?.professionalRole === fixture.professionalRole, `form field '${fixture.professionalFieldKey}' must require role '${fixture.professionalRole}'.`)

  console.log(`OBO development scenario verified: professional selection is form-owned for ${fixture.referenceNumber}.`)
  return true
}

export { OBO_DEVELOPMENT_FIXTURE, OBO_WORKFLOW, seedOboDevelopmentScenario, seedOboWorkflow, verifyOboDevelopmentScenario }

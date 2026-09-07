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
  referenceNumber: 'OBO-DEV-20300610-0001',
  appointmentReferenceNumber: 'OBO-APPT-DEV-0001',
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
      create: { workflowVersionId: version.id, fromStepId: fromStep.id, toStepId: toStep.id, key: transition.key, name: transition.name, permissionKey: transition.permissionKey },
    })
  }

  return { workflow, version, steps: stepByKey }
}

async function seedOboDevelopmentScenario(prisma, { roles, passwordHash = null }) {
  const { version, steps } = await seedOboWorkflow(prisma)
  const now = new Date('2030-06-10T08:00:00.000Z')
  const appointmentStart = new Date('2030-06-14T09:00:00.000Z')
  const appointmentEnd = new Date('2030-06-14T09:30:00.000Z')

  const clientUser = await ensureUser(prisma, { email: OBO_DEVELOPMENT_FIXTURE.clientEmail, roleId: roles.client.id, passwordHash })
  const professionalUser = await ensureUser(prisma, { email: OBO_DEVELOPMENT_FIXTURE.professionalEmail, roleId: roles.professional.id, passwordHash })
  const receivingOfficer = await ensureUser(prisma, { email: OBO_DEVELOPMENT_FIXTURE.receivingOfficerEmail, roleId: roles.receiving_officer.id, passwordHash })

  const clientPerson = await prisma.person.upsert({
    where: { userId: clientUser.id },
    update: { firstName: 'OBO', lastName: 'Client', email: clientUser.email, phone: '+630000000001', isActive: true },
    create: { userId: clientUser.id, firstName: 'OBO', lastName: 'Client', email: clientUser.email, phone: '+630000000001' },
  })
  const professionalPerson = await prisma.person.upsert({
    where: { userId: professionalUser.id },
    update: { firstName: 'OBO', lastName: 'Professional', email: professionalUser.email, phone: '+630000000002', isActive: true },
    create: { userId: professionalUser.id, firstName: 'OBO', lastName: 'Professional', email: professionalUser.email, phone: '+630000000002' },
  })

  const professional = await prisma.oboProfessional.upsert({
    where: { registrationNumber: OBO_DEVELOPMENT_FIXTURE.registrationNumber },
    update: { personId: professionalPerson.id, userId: professionalUser.id, prcId: 'DEV-PRC-0001', ptrNumber: 'DEV-PTR-0001', status: 'VERIFIED', verifiedByUserId: receivingOfficer.id, verifiedAt: now, verificationReason: 'Development seed verification' },
    create: { personId: professionalPerson.id, userId: professionalUser.id, registrationNumber: OBO_DEVELOPMENT_FIXTURE.registrationNumber, prcId: 'DEV-PRC-0001', ptrNumber: 'DEV-PTR-0001', status: 'VERIFIED', verifiedByUserId: receivingOfficer.id, verifiedAt: now, verificationReason: 'Development seed verification' },
  })

  const verificationDecision = await prisma.oboProfessionalVerificationDecision.findFirst({ where: { professionalId: professional.id, decision: 'ACCEPTED' }, orderBy: { decidedAt: 'desc' } })
  if (verificationDecision) {
    await prisma.oboProfessionalVerificationDecision.update({ where: { id: verificationDecision.id }, data: { reason: 'Development seed verification', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  } else {
    await prisma.oboProfessionalVerificationDecision.create({ data: { professionalId: professional.id, decision: 'ACCEPTED', reason: 'Development seed verification', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  }

  const caseType = await prisma.caseType.upsert({
    where: { key: 'obo-permit-application' },
    update: { name: 'OBO Permit Application', isActive: true },
    create: { key: 'obo-permit-application', name: 'OBO Permit Application', description: 'OBO permit application lifecycle' },
  })

  const permitType = await prisma.oboPermitType.findUnique({ where: { key: 'building-plan-permit' } })
  if (!permitType) throw new Error("OBO reference fixture 'building-plan-permit' was not seeded.")

  const referenceNumber = OBO_DEVELOPMENT_FIXTURE.referenceNumber
  const caseRecord = await prisma.caseRecord.upsert({
    where: { caseNumber: referenceNumber },
    update: { caseTypeId: caseType.id, title: `${permitType.name} Application`, status: 'OPEN', createdByUserId: clientUser.id },
    create: { caseNumber: referenceNumber, caseTypeId: caseType.id, title: `${permitType.name} Application`, status: 'OPEN', createdByUserId: clientUser.id, openedAt: now },
  })

  const existingApplication = await prisma.oboPermitApplication.findUnique({ where: { referenceNumber }, select: { workflowInstanceId: true } })
  let workflowInstance
  if (existingApplication?.workflowInstanceId) {
    workflowInstance = await prisma.workflowInstance.update({
      where: { id: existingApplication.workflowInstanceId },
      data: { workflowVersionId: version.id, currentStepId: steps.get('FOR_INSPECTION').id, completedAt: now, startedByUserId: clientUser.id },
    })
  } else {
    workflowInstance = await prisma.workflowInstance.create({
      data: { workflowVersionId: version.id, currentStepId: steps.get('FOR_INSPECTION').id, subjectType: 'OboPermitApplication', subjectId: referenceNumber, startedByUserId: clientUser.id, startedAt: now, completedAt: now },
    })
  }

  const application = await prisma.oboPermitApplication.upsert({
    where: { referenceNumber },
    update: { caseId: caseRecord.id, permitTypeId: permitType.id, clientPersonId: clientPerson.id, professionalId: professional.id, workflowInstanceId: workflowInstance.id, formValues: { projectName: 'Development Seed Building', projectType: 'RESIDENTIAL', floorAreaSqm: 120, address: 'Development Test Site' }, submittedAt: now, acceptedAt: now, acceptedByUserId: receivingOfficer.id, declinedAt: null, declineReason: null },
    create: { referenceNumber, caseId: caseRecord.id, permitTypeId: permitType.id, clientPersonId: clientPerson.id, professionalId: professional.id, workflowInstanceId: workflowInstance.id, formValues: { projectName: 'Development Seed Building', projectType: 'RESIDENTIAL', floorAreaSqm: 120, address: 'Development Test Site' }, submittedAt: now, acceptedAt: now, acceptedByUserId: receivingOfficer.id },
  })

  await prisma.workflowInstance.update({ where: { id: workflowInstance.id }, data: { subjectId: application.id } })

  const appointmentType = await prisma.appointmentType.findUnique({ where: { key: 'obo-hardcopy-submission' } })
  if (!appointmentType) throw new Error("OBO reference fixture 'obo-hardcopy-submission' was not seeded.")
  const slot = await prisma.appointmentSlot.upsert({
    where: { appointmentTypeId_startsAt: { appointmentTypeId: appointmentType.id, startsAt: appointmentStart } },
    update: { endsAt: appointmentEnd, capacity: 1, bookedCount: 1, status: 'BOOKED' },
    create: { appointmentTypeId: appointmentType.id, startsAt: appointmentStart, endsAt: appointmentEnd, capacity: 1, bookedCount: 1, status: 'BOOKED' },
  })
  const appointment = await prisma.appointment.upsert({
    where: { referenceNumber: OBO_DEVELOPMENT_FIXTURE.appointmentReferenceNumber },
    update: { appointmentTypeId: appointmentType.id, slotId: slot.id, userId: clientUser.id, status: 'COMPLETED', checkedInAt: appointmentStart, completedAt: appointmentEnd, metadata: { applicationId: application.id, purpose: 'hardcopy_submission' } },
    create: { referenceNumber: OBO_DEVELOPMENT_FIXTURE.appointmentReferenceNumber, appointmentTypeId: appointmentType.id, slotId: slot.id, userId: clientUser.id, status: 'COMPLETED', checkedInAt: appointmentStart, completedAt: appointmentEnd, metadata: { applicationId: application.id, purpose: 'hardcopy_submission' } },
  })
  await prisma.oboSubmissionAppointment.upsert({ where: { applicationId: application.id }, update: { appointmentId: appointment.id }, create: { applicationId: application.id, appointmentId: appointment.id } })

  const history = [
    ['DRAFT', 'READY_FOR_SUBMISSION', 'SUBMIT_FOR_SUBMISSION'],
    ['READY_FOR_SUBMISSION', 'SUBMISSION_SCHEDULED', 'SCHEDULE_SUBMISSION'],
    ['SUBMISSION_SCHEDULED', 'RECEIVING', 'RECEIVE_HARDCOPY'],
    ['RECEIVING', 'FOR_INSPECTION', 'ACCEPT_FOR_INSPECTION'],
  ]
  for (const [fromKey, toKey, transitionKey] of history) {
    const transition = await prisma.workflowTransition.findUnique({ where: { workflowVersionId_key: { workflowVersionId: version.id, key: transitionKey } } })
    if (!transition) throw new Error(`OBO workflow transition '${transitionKey}' was not seeded.`)
    const existing = await prisma.workflowHistory.findFirst({ where: { instanceId: workflowInstance.id, transitionId: transition.id } })
    if (!existing) {
      await prisma.workflowHistory.create({
        data: {
          instanceId: workflowInstance.id,
          fromStepId: steps.get(fromKey).id,
          toStepId: steps.get(toKey).id,
          transitionId: transition.id,
          actorId: toKey === 'FOR_INSPECTION' || toKey === 'RECEIVING' ? receivingOfficer.id : clientUser.id,
          createdAt: now,
        },
      })
    }
  }

  const receivingDecision = await prisma.oboReceivingDecision.findFirst({ where: { applicationId: application.id, decision: 'ACCEPTED' }, orderBy: { decidedAt: 'desc' } })
  if (receivingDecision) {
    await prisma.oboReceivingDecision.update({ where: { id: receivingDecision.id }, data: { reason: 'Development seed hardcopy accepted', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  } else {
    await prisma.oboReceivingDecision.create({ data: { applicationId: application.id, decision: 'ACCEPTED', reason: 'Development seed hardcopy accepted', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  }

  console.log(`OBO development scenario ensured: ${referenceNumber}`)
  return { clientUser, professionalUser, receivingOfficer, clientPerson, professional, application, appointment, workflowInstance }
}

const requireCondition = (condition, message) => {
  if (!condition) throw new Error(`OBO seed verification failed: ${message}`)
}

async function verifyOboDevelopmentScenario(prisma) {
  const fixture = OBO_DEVELOPMENT_FIXTURE
  const clientUser = await prisma.user.findUnique({ where: { email: fixture.clientEmail }, select: { id: true } })
  const professionalUser = await prisma.user.findUnique({ where: { email: fixture.professionalEmail }, select: { id: true } })
  const receivingOfficer = await prisma.user.findUnique({ where: { email: fixture.receivingOfficerEmail }, select: { id: true } })

  requireCondition(clientUser, `client user '${fixture.clientEmail}' does not exist.`)
  requireCondition(professionalUser, `professional user '${fixture.professionalEmail}' does not exist.`)
  requireCondition(receivingOfficer, `receiving officer '${fixture.receivingOfficerEmail}' does not exist.`)

  const professional = await prisma.oboProfessional.findUnique({ where: { registrationNumber: fixture.registrationNumber }, select: { id: true, userId: true, status: true, verifiedByUserId: true } })
  requireCondition(professional, `professional '${fixture.registrationNumber}' does not exist.`)
  requireCondition(professional.userId === professionalUser.id, 'professional user linkage is incorrect.')
  requireCondition(professional.status === 'VERIFIED', `professional status is '${professional.status}', expected VERIFIED.`)
  requireCondition(professional.verifiedByUserId === receivingOfficer.id, 'professional verifier linkage is incorrect.')

  const verificationDecision = await prisma.oboProfessionalVerificationDecision.findFirst({ where: { professionalId: professional.id, decision: 'ACCEPTED' }, select: { id: true, decidedByUserId: true, decidedAt: true } })
  requireCondition(verificationDecision, 'accepted professional verification decision does not exist.')
  requireCondition(verificationDecision.decidedByUserId === receivingOfficer.id, 'professional verification decision actor is incorrect.')
  requireCondition(verificationDecision.decidedAt, 'professional verification decision timestamp is missing.')

  const application = await prisma.oboPermitApplication.findUnique({ where: { referenceNumber: fixture.referenceNumber }, include: { caseRecord: true, permitType: true, clientPerson: true, professional: true, workflowInstance: { include: { currentStep: true, workflowVersion: true } }, submissionAppointment: { include: { appointment: { include: { appointmentType: true, slot: true } } } }, decisions: true } })
  requireCondition(application, `application '${fixture.referenceNumber}' does not exist.`)
  requireCondition(application.caseRecord, 'application case record is missing.')
  requireCondition(application.permitType?.key === 'building-plan-permit', 'application permit type is incorrect.')
  requireCondition(application.clientPerson?.userId === clientUser.id, 'application client linkage is incorrect.')
  requireCondition(application.professional?.id === professional.id, 'application professional linkage is incorrect.')
  requireCondition(application.workflowInstance, 'application workflow instance is missing.')
  requireCondition(application.workflowInstance.currentStep?.key === 'FOR_INSPECTION', 'application workflow is not at FOR_INSPECTION.')
  requireCondition(application.workflowInstance.completedAt, 'application workflow completion timestamp is missing.')
  requireCondition(application.workflowInstance.workflowVersion?.status === 'PUBLISHED', 'application workflow version is not published.')
  requireCondition(application.submissionAppointment?.appointment?.appointmentType?.key === 'obo-hardcopy-submission', 'submission appointment type is incorrect.')
  requireCondition(application.submissionAppointment.appointment.status === 'COMPLETED', 'submission appointment is not completed.')
  requireCondition(application.submissionAppointment.appointment.slot?.status === 'BOOKED', 'submission appointment slot status is incorrect.')
  requireCondition(application.submissionAppointment.appointment.slot?.bookedCount === 1, 'submission appointment slot booked count is incorrect.')
  const acceptedDecision = application.decisions.find((decision) => decision.decision === 'ACCEPTED')
  requireCondition(acceptedDecision, 'accepted receiving decision does not exist.')
  requireCondition(acceptedDecision.decidedByUserId === receivingOfficer.id, 'receiving decision actor is incorrect.')
  requireCondition(acceptedDecision.decidedAt, 'receiving decision timestamp is missing.')

  const transitions = await prisma.workflowTransition.findMany({ where: { workflowVersionId: application.workflowInstance.workflowVersionId } })
  const transitionKeys = new Set(transitions.map((transition) => transition.key))
  for (const key of ['SUBMIT_FOR_SUBMISSION', 'SCHEDULE_SUBMISSION', 'RECEIVE_HARDCOPY', 'DECLINE', 'ACCEPT_FOR_INSPECTION']) requireCondition(transitionKeys.has(key), `workflow transition '${key}' is missing.`)

  const history = await prisma.workflowHistory.findMany({ where: { instanceId: application.workflowInstance.id }, select: { transitionId: true } })
  const transitionIds = new Set(history.map((item) => item.transitionId))
  for (const transition of transitions.filter((item) => ['SUBMIT_FOR_SUBMISSION', 'SCHEDULE_SUBMISSION', 'RECEIVE_HARDCOPY', 'ACCEPT_FOR_INSPECTION'].includes(item.key))) requireCondition(transitionIds.has(transition.id), `workflow history for '${transition.key}' is missing.`)

  console.log(`OBO development scenario verified: ${fixture.referenceNumber}`)
}

export { OBO_DEVELOPMENT_FIXTURE, seedOboDevelopmentScenario, verifyOboDevelopmentScenario }
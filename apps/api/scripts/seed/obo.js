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

  const clientUser = await ensureUser(prisma, { email: 'obo-client@example.test', roleId: roles.client.id, passwordHash })
  const professionalUser = await ensureUser(prisma, { email: 'obo-professional@example.test', roleId: roles.professional.id, passwordHash })
  const receivingOfficer = await ensureUser(prisma, { email: 'obo-receiving-officer@example.test', roleId: roles.receiving_officer.id, passwordHash })

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
    where: { registrationNumber: 'DEV-OBO-PRC-0001' },
    update: { personId: professionalPerson.id, userId: professionalUser.id, prcId: 'DEV-PRC-0001', ptrNumber: 'DEV-PTR-0001', status: 'VERIFIED', verifiedByUserId: receivingOfficer.id, verifiedAt: now, verificationReason: 'Development seed verification' },
    create: { personId: professionalPerson.id, userId: professionalUser.id, registrationNumber: 'DEV-OBO-PRC-0001', prcId: 'DEV-PRC-0001', ptrNumber: 'DEV-PTR-0001', status: 'VERIFIED', verifiedByUserId: receivingOfficer.id, verifiedAt: now, verificationReason: 'Development seed verification' },
  })

  const verificationDecision = await prisma.oboProfessionalVerificationDecision.findFirst({ where: { professionalId: professional.id, decision: 'ACCEPTED' }, orderBy: { decidedAt: 'desc' } })
  if (verificationDecision) {
    await prisma.oboProfessionalVerificationDecision.update({ where: { id: verificationDecision.id }, data: { reason: 'Development seed verification', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  } else {
    await prisma.oboProfessionalVerificationDecision.create({ data: { professionalId: professional.id, decision: 'ACCEPTED', reason: 'Development seed verification', decidedByUserId: receivingOfficer.id, decidedAt: now } })
  }

  const permitType = await prisma.oboPermitType.upsert({
    where: { key: 'building-plan-permit' },
    update: { name: 'Building Plan Permit', isActive: true },
    create: { key: 'building-plan-permit', name: 'Building Plan Permit', description: 'Plan permit application for building construction and related work.' },
  })
  const caseType = await prisma.caseType.upsert({
    where: { key: 'obo-permit-application' },
    update: { name: 'OBO Permit Application', isActive: true },
    create: { key: 'obo-permit-application', name: 'OBO Permit Application', description: 'OBO permit application lifecycle' },
  })

  const referenceNumber = 'OBO-DEV-20300610-0001'
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
      data: { workflowVersionId: version.id, currentStepId: steps.FOR_INSPECTION.id, completedAt: now, startedByUserId: clientUser.id },
    })
  } else {
    workflowInstance = await prisma.workflowInstance.create({
      data: { workflowVersionId: version.id, currentStepId: steps.FOR_INSPECTION.id, subjectType: 'OboPermitApplication', subjectId: referenceNumber, startedByUserId: clientUser.id, startedAt: now, completedAt: now },
    })
  }

  const application = await prisma.oboPermitApplication.upsert({
    where: { referenceNumber },
    update: { caseId: caseRecord.id, permitTypeId: permitType.id, clientPersonId: clientPerson.id, professionalId: professional.id, workflowInstanceId: workflowInstance.id, formValues: { projectName: 'Development Seed Building', projectType: 'RESIDENTIAL', floorAreaSqm: 120, address: 'Development Test Site' }, submittedAt: now, acceptedAt: now, acceptedByUserId: receivingOfficer.id, declinedAt: null, declineReason: null },
    create: { referenceNumber, caseId: caseRecord.id, permitTypeId: permitType.id, clientPersonId: clientPerson.id, professionalId: professional.id, workflowInstanceId: workflowInstance.id, formValues: { projectName: 'Development Seed Building', projectType: 'RESIDENTIAL', floorAreaSqm: 120, address: 'Development Test Site' }, submittedAt: now, acceptedAt: now, acceptedByUserId: receivingOfficer.id },
  })

  await prisma.workflowInstance.update({ where: { id: workflowInstance.id }, data: { subjectId: application.id } })

  const appointmentType = await prisma.appointmentType.upsert({
    where: { key: 'obo-hardcopy-submission' },
    update: { name: 'OBO Hardcopy Submission', isActive: true },
    create: { key: 'obo-hardcopy-submission', name: 'OBO Hardcopy Submission', description: 'Physical hardcopy submission appointment for an OBO permit application.', defaultDurationMinutes: 30, defaultCapacity: 1 },
  })
  const slot = await prisma.appointmentSlot.upsert({
    where: { appointmentTypeId_startsAt: { appointmentTypeId: appointmentType.id, startsAt: appointmentStart } },
    update: { endsAt: appointmentEnd, capacity: 1, bookedCount: 1, status: 'BOOKED' },
    create: { appointmentTypeId: appointmentType.id, startsAt: appointmentStart, endsAt: appointmentEnd, capacity: 1, bookedCount: 1, status: 'BOOKED' },
  })
  const appointment = await prisma.appointment.upsert({
    where: { referenceNumber: 'OBO-APPT-DEV-0001' },
    update: { appointmentTypeId: appointmentType.id, slotId: slot.id, userId: clientUser.id, status: 'COMPLETED', checkedInAt: appointmentStart, completedAt: appointmentEnd, metadata: { applicationId: application.id, purpose: 'hardcopy_submission' } },
    create: { referenceNumber: 'OBO-APPT-DEV-0001', appointmentTypeId: appointmentType.id, slotId: slot.id, userId: clientUser.id, status: 'COMPLETED', checkedInAt: appointmentStart, completedAt: appointmentEnd, metadata: { applicationId: application.id, purpose: 'hardcopy_submission' } },
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
          fromStepId: steps[fromKey].id,
          toStepId: steps[toKey].id,
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

export { seedOboWorkflow, seedOboDevelopmentScenario }

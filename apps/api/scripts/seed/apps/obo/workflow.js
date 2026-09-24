const OBO_WORKFLOW = {
  key: 'obo_application',
  name: 'OBO Application',
  description: 'Lifecycle workflow for an OBO application.',
  steps: [
    { key: 'DRAFT', name: 'Draft', isInitial: true, isFinal: false, sortOrder: 0 },
    { key: 'READY_FOR_SUBMISSION', name: 'Ready for Submission', isInitial: false, isFinal: false, sortOrder: 1 },
    { key: 'SUBMISSION_SCHEDULED', name: 'Submission Scheduled', isInitial: false, isFinal: false, sortOrder: 2 },
    { key: 'RECEIVING', name: 'Receiving', isInitial: false, isFinal: false, sortOrder: 3 },
    { key: 'DECLINED', name: 'Declined', isInitial: false, isFinal: true, sortOrder: 4 },
    { key: 'FOR_INSPECTION', name: 'For Inspection', isInitial: false, isFinal: true, sortOrder: 5 },
  ],
  transitions: [
    { key: 'SUBMIT_FOR_SUBMISSION', name: 'Submit for Submission', fromStepKey: 'DRAFT', toStepKey: 'READY_FOR_SUBMISSION', permissionKey: 'obo_applications:submit' },
    { key: 'SCHEDULE_SUBMISSION', name: 'Schedule Hardcopy Submission', fromStepKey: 'READY_FOR_SUBMISSION', toStepKey: 'SUBMISSION_SCHEDULED', permissionKey: 'obo_applications:schedule_submission' },
    { key: 'RECEIVE_HARDCOPY', name: 'Receive Hardcopy', fromStepKey: 'SUBMISSION_SCHEDULED', toStepKey: 'RECEIVING', permissionKey: 'obo_applications:receive' },
    { key: 'DECLINE', name: 'Decline Application', fromStepKey: 'RECEIVING', toStepKey: 'DECLINED', permissionKey: 'obo_applications:receive' },
    { key: 'ACCEPT_FOR_INSPECTION', name: 'Accept for Inspection', fromStepKey: 'RECEIVING', toStepKey: 'FOR_INSPECTION', permissionKey: 'obo_applications:receive' },
  ],
}

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

async function getOboWorkflow(prisma) {
  const workflow = await prisma.workflow.findUnique({
    where: { key: OBO_WORKFLOW.key },
    include: { versions: { where: { version: 1 }, take: 1, include: { steps: true } } },
  })
  const version = workflow?.versions?.[0]
  if (!workflow || !version || version.status !== 'PUBLISHED') {
    throw new Error("Published OBO workflow 'obo_application' v1 is missing. Run the OBO startup seed first.")
  }
  return { workflow, version, steps: new Map(version.steps.map((step) => [step.key, step])) }
}

export { OBO_WORKFLOW, seedOboWorkflow, getOboWorkflow }

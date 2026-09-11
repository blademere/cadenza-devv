import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  applicationSchema: new URL('../../../../prisma/modules/obo/permit-applications.prisma', import.meta.url),
  workflowSeed: new URL('../../../../scripts/seed/obo-development.js', import.meta.url),
  planPermitWorkflow: new URL('../../../../src/modules/obo/plan-permits/plan-permit.workflow.js', import.meta.url),
  planPermitService: new URL('../../../../src/modules/obo/plan-permits/plan-permit.service.js', import.meta.url),
  submissionAppointmentService: new URL('../../../../src/modules/obo/submission-appointments/submission-appointment.service.js', import.meta.url),
  receivingService: new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('Phase 24 OBO workflow authority contract', () => {
  it('stores a workflow instance reference instead of an OBO lifecycle status column', async () => {
    const source = await readText(paths.applicationSchema)

    expect(source).toContain('workflowInstanceId')
    expect(source).not.toMatch(/\n\s+status\s+String/)
    expect(source).not.toMatch(/\n\s+status\s+.*@default/)
  })

  it('defines the OBO lifecycle in the platform workflow seed', async () => {
    const source = await readText(paths.workflowSeed)

    for (const step of [
      'DRAFT',
      'READY_FOR_SUBMISSION',
      'SUBMISSION_SCHEDULED',
      'RECEIVING',
      'DECLINED',
      'FOR_INSPECTION',
    ]) {
      expect(source).toContain(`key: '${step}'`)
    }

    for (const transition of [
      'SUBMIT_FOR_SUBMISSION',
      'SCHEDULE_SUBMISSION',
      'RECEIVE_HARDCOPY',
      'DECLINE',
      'ACCEPT_FOR_INSPECTION',
    ]) {
      expect(source).toContain(`key: '${transition}'`)
    }
  })

  it('keeps workflow state resolution behind the platform workflow service', async () => {
    const source = await readText(paths.planPermitWorkflow)

    expect(source).toContain("../../../platform/workflow/workflow.service.js")
    expect(source).toContain('workflowService.getWorkflowInstance')
    expect(source).not.toContain('prisma.')
  })

  it('starts the workflow when a permit application is created', async () => {
    const source = await readText(paths.planPermitService)

    expect(source).toContain("const WORKFLOW_KEY = 'obo_plan_permit'")
    expect(source).toContain('workflowService.startWorkflow')
    expect(source).toContain('workflowInstanceId: workflow.id')
    expect(source).toContain('workflowService.transitionWorkflow')
  })

  it('uses workflow transitions for appointment scheduling and receiving', async () => {
    const appointmentSource = await readText(paths.submissionAppointmentService)
    const receivingSource = await readText(paths.receivingService)

    expect(appointmentSource).toContain("transitionKey: 'SCHEDULE_SUBMISSION'")
    expect(receivingSource).toContain("transitionKey: 'RECEIVE_HARDCOPY'")
    expect(receivingSource).toContain("transitionKey = accepted ? 'ACCEPT_FOR_INSPECTION' : 'DECLINE'")
    expect(receivingSource).not.toContain("status: 'FOR_INSPECTION'")
    expect(receivingSource).not.toContain("status: 'DECLINED'")
  })
})

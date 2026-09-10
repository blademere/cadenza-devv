import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  planPermitRepository: new URL('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', import.meta.url),
  planPermitForm: new URL('../../../../src/modules/obo/plan-permits/plan-permit.form.js', import.meta.url),
  planPermitWorkflow: new URL('../../../../src/modules/obo/plan-permits/plan-permit.workflow.js', import.meta.url),
  receivingRepository: new URL('../../../../src/modules/obo/receiving/receiving.repository.js', import.meta.url),
  receivingService: new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('Phase 23 OBO platform boundary contract', () => {
  it('keeps Plan Permit repository free of cross-domain service/repository access', async () => {
    const source = await readText(paths.planPermitRepository)
    expect(source).not.toContain('form.repository.js')
    expect(source).not.toContain('workflow.repository.js')
    expect(source).not.toContain('appointment.service.js')
  })

  it('keeps Plan Permit form resolution behind Platform Forms service', async () => {
    const source = await readText(paths.planPermitForm)
    expect(source).toContain("../../../platform/forms/form.service.js")
    expect(source).not.toContain('plan-permit.repository.js')
    expect(source).toContain('formService.getFormById')
    expect(source).toContain('formService.getFormVersionById')
  })

  it('keeps Plan Permit workflow state behind Platform Workflow service', async () => {
    const source = await readText(paths.planPermitWorkflow)
    expect(source).toContain("../../../platform/workflow/workflow.service.js")
    expect(source).not.toContain('plan-permit.repository.js')
    expect(source).toContain('workflowService.getWorkflowInstance')
  })

  it('keeps Receiving repository limited to persistence and cross-domain access in service layer', async () => {
    const repository = await readText(paths.receivingRepository)
    const service = await readText(paths.receivingService)
    expect(repository).not.toContain('workflow.repository.js')
    expect(repository).not.toContain('appointment.service.js')
    expect(repository).toContain('db.oboReceivingDecision.create')
    expect(service).toContain("../../../platform/workflow/workflow.service.js")
    expect(service).toContain("../../../features/appointments/appointment.service.js")
  })
})

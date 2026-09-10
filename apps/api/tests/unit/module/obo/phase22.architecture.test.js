import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  planPermitRepository: new URL('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', import.meta.url),
  planPermitService: new URL('../../../../src/modules/obo/plan-permits/plan-permit.service.js', import.meta.url),
  planPermitForm: new URL('../../../../src/modules/obo/plan-permits/plan-permit.form.js', import.meta.url),
  planPermitWorkflow: new URL('../../../../src/modules/obo/plan-permits/plan-permit.workflow.js', import.meta.url),
  permitTypeService: new URL('../../../../src/modules/obo/permit-types/permit-type.service.js', import.meta.url),
  clientRepository: new URL('../../../../src/modules/obo/clients/client.repository.js', import.meta.url),
  clientService: new URL('../../../../src/modules/obo/clients/client.service.js', import.meta.url),
  casesService: new URL('../../../../src/features/cases/cases.service.js', import.meta.url),
  receivingRepository: new URL('../../../../src/modules/obo/receiving/receiving.repository.js', import.meta.url),
  receivingService: new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('OBO separation boundary contract', () => {
  it('keeps Plan Permit repository scoped to permit application persistence', async () => {
    const source = await readText(paths.planPermitRepository)
    expect(source).not.toContain('db.oboPermitType')
    expect(source).not.toContain('db.oboReceivingDecision')
    expect(source).not.toContain('db.caseRecord')
    expect(source).not.toContain('db.caseType')
    expect(source).not.toContain('form.repository.js')
    expect(source).not.toContain('workflow.repository.js')
    expect(source).not.toContain('appointment.service.js')
  })

  it('routes Plan Permit dependencies through domain and platform services', async () => {
    const planPermit = await readText(paths.planPermitService)
    const form = await readText(paths.planPermitForm)
    const workflow = await readText(paths.planPermitWorkflow)
    const permitTypes = await readText(paths.permitTypeService)
    const cases = await readText(paths.casesService)

    expect(planPermit).toContain("../permit-types/permit-type.service.js")
    expect(planPermit).toContain('permitTypeService.getPermitTypeById')
    expect(planPermit).toContain("../../../features/cases/cases.service.js")
    expect(planPermit).toContain('caseService.getOrCreateType')
    expect(planPermit).toContain('caseService.createRecord')
    expect(permitTypes).toContain('const getPermitTypeById')
    expect(cases).toContain('const getOrCreateType')
    expect(form).toContain("../../../platform/forms/form.service.js")
    expect(form).not.toContain('plan-permit.repository.js')
    expect(form).toContain('formService.getFormById')
    expect(form).toContain('formService.getPublishedForm')
    expect(workflow).toContain("../../../platform/workflow/workflow.service.js")
    expect(workflow).not.toContain('plan-permit.repository.js')
    expect(workflow).toContain('workflowService.getWorkflowInstance')
  })

  it('keeps Receiving persistence inside Receiving while services own cross-domain access', async () => {
    const receiving = await readText(paths.receivingRepository)
    const service = await readText(paths.receivingService)
    expect(receiving).not.toContain('workflow.repository.js')
    expect(receiving).not.toContain('appointment.service.js')
    expect(receiving).toContain('db.oboReceivingDecision.create')
    expect(service).toContain("../../../platform/workflow/workflow.service.js")
    expect(service).toContain("../../../features/appointments/appointment.service.js")
    expect(service).toContain('workflowService.getWorkflowInstance')
    expect(service).toContain('appointmentService.getAppointmentForReference')
  })

  it('keeps OBO Clients behind the shared People service', async () => {
    const repository = await readText(paths.clientRepository)
    const service = await readText(paths.clientService)
    expect(repository).not.toContain('features/people/people.repository.js')
    expect(repository).not.toContain('db.person')
    expect(service).toContain("../../../features/people/people.service.js")
    expect(service).toContain('peopleService.getByUserId')
    expect(service).toContain('peopleService.create')
    expect(service).toContain('peopleService.update')
  })
})

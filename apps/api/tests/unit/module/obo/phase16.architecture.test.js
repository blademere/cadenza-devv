import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const planPermitServicePath = new URL('../../../../src/modules/obo/plan-permits/plan-permit.service.js', import.meta.url)
const receivingServicePath = new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url)
const planPermitRepositoryPath = new URL('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', import.meta.url)
const receivingRepositoryPath = new URL('../../../../src/modules/obo/receiving/receiving.repository.js', import.meta.url)
const workflowRepositoryPath = new URL('../../../../src/platform/workflow/workflow.repository.js', import.meta.url)
const appointmentRepositoryPath = new URL('../../../../src/features/appointments/appointment.repository.js', import.meta.url)
const appointmentServicePath = new URL('../../../../src/features/appointments/appointment.service.js', import.meta.url)
const submissionAppointmentServicePath = new URL('../../../../src/modules/obo/submission-appointments/submission-appointment.service.js', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

describe('Phase 16 shared persistence boundary contract', () => {
  it('keeps OBO workflow persistence behind the Platform Workflow service boundary', async () => {
    const planPermitService = await readText(planPermitServicePath)
    const receivingService = await readText(receivingServicePath)
    const planPermitRepository = await readText(planPermitRepositoryPath)
    const receivingRepository = await readText(receivingRepositoryPath)
    const workflowRepository = await readText(workflowRepositoryPath)

    expect(planPermitService).toContain("../../../platform/workflow/workflow.service.js")
    expect(planPermitService).toContain('workflowService.startWorkflow')
    expect(planPermitService).toContain('workflowService.transitionWorkflow')
    expect(receivingService).toContain("../../../platform/workflow/workflow.service.js")
    expect(receivingService).toContain('workflowService.getWorkflowInstance')
    expect(planPermitRepository).not.toContain('workflow.repository.js')
    expect(receivingRepository).not.toContain('workflow.repository.js')
    expect(workflowRepository).toContain('db.workflow.findUnique')
    expect(workflowRepository).toContain('db.workflowInstance.findUnique')
    expect(workflowRepository).toContain('db.workflowInstance.findMany')
  })

  it('keeps OBO appointment persistence behind the Appointment feature service', async () => {
    const receivingService = await readText(receivingServicePath)
    const receivingRepository = await readText(receivingRepositoryPath)
    const appointmentRepository = await readText(appointmentRepositoryPath)
    const appointmentService = await readText(appointmentServicePath)
    const submissionAppointmentService = await readText(submissionAppointmentServicePath)

    expect(receivingService).toContain("../../../features/appointments/appointment.service.js")
    expect(receivingService).toContain('appointmentService.getAppointmentForReference')
    expect(receivingRepository).not.toContain('appointment.service.js')
    expect(submissionAppointmentService).toContain("../../../features/appointments/appointment.service.js")
    expect(submissionAppointmentService).toContain('appointmentService.bookAppointment')
    expect(submissionAppointmentService).toContain('appointmentService.getMyAppointment')
    expect(appointmentService).toContain('const getAppointmentForReference')
    expect(appointmentService).toContain('const listAppointmentsForReferences')
    expect(appointmentRepository).toContain('db.appointment.findUnique')
    expect(appointmentRepository).toContain('db.appointment.findMany')
  })
})

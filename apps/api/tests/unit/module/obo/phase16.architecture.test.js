import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const planPermitRepositoryPath = new URL('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', import.meta.url)
const receivingRepositoryPath = new URL('../../../../src/modules/obo/receiving/receiving.repository.js', import.meta.url)
const workflowRepositoryPath = new URL('../../../../src/platform/workflow/workflow.repository.js', import.meta.url)
const appointmentRepositoryPath = new URL('../../../../src/features/appointments/appointment.repository.js', import.meta.url)
const appointmentServicePath = new URL('../../../../src/features/appointments/appointment.service.js', import.meta.url)
const submissionAppointmentServicePath = new URL('../../../../src/modules/obo/submission-appointments/submission-appointment.service.js', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

describe('Phase 16 shared persistence boundary contract', () => {
  it('keeps OBO workflow persistence behind Platform Workflow', async () => {
    const planPermitRepository = await readText(planPermitRepositoryPath)
    const receivingRepository = await readText(receivingRepositoryPath)
    const workflowRepository = await readText(workflowRepositoryPath)

    expect(planPermitRepository).toContain("../../../platform/workflow/workflow.repository.js")
    expect(planPermitRepository).toContain('workflowRepository.findInstance')
    expect(planPermitRepository).not.toMatch(/db\.workflow(?:Instance|Version)?\s*\./)

    expect(receivingRepository).toContain("../../../platform/workflow/workflow.repository.js")
    expect(receivingRepository).toContain('workflowRepository.findInstance')
    expect(receivingRepository).toContain('workflowRepository.findInstancesByIds')
    expect(receivingRepository).not.toMatch(/db\.workflow(?:Instance|Version)?\s*\./)

    expect(workflowRepository).toContain('db.workflow.findUnique')
    expect(workflowRepository).toContain('db.workflowInstance.findUnique')
    expect(workflowRepository).toContain('db.workflowInstance.findMany')
  })

  it('keeps OBO appointment persistence behind the Appointment feature service', async () => {
    const receivingRepository = await readText(receivingRepositoryPath)
    const appointmentRepository = await readText(appointmentRepositoryPath)
    const appointmentService = await readText(appointmentServicePath)
    const submissionAppointmentService = await readText(submissionAppointmentServicePath)

    expect(receivingRepository).toContain("../../../features/appointments/appointment.service.js")
    expect(receivingRepository).toContain('appointmentService.getAppointmentForReference')
    expect(receivingRepository).toContain('appointmentService.listAppointmentsForReferences')
    expect(receivingRepository).not.toMatch(/db\.appointment(?:Type|Slot)?\s*\./)

    expect(submissionAppointmentService).toContain("../../../features/appointments/appointment.service.js")
    expect(submissionAppointmentService).toContain('appointmentService.bookAppointment')
    expect(submissionAppointmentService).toContain('appointmentService.getMyAppointment')

    expect(appointmentService).toContain('const getAppointmentForReference')
    expect(appointmentService).toContain('const listAppointmentsForReferences')
    expect(appointmentRepository).toContain('db.appointment.findUnique')
    expect(appointmentRepository).toContain('db.appointment.findMany')
  })
})

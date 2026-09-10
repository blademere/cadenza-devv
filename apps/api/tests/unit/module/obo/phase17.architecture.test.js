import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  planPermitController: new URL('../../../../src/modules/obo/plan-permits/plan-permit.controller.js', import.meta.url),
  permitTypeController: new URL('../../../../src/modules/obo/permit-types/permit-type.controller.js', import.meta.url),
  professionalController: new URL('../../../../src/modules/obo/professionals/professional.controller.js', import.meta.url),
  receivingController: new URL('../../../../src/modules/obo/receiving/receiving.controller.js', import.meta.url),
  submissionAppointmentController: new URL('../../../../src/modules/obo/submission-appointments/submission-appointment.controller.js', import.meta.url),
  professionalRoutes: new URL('../../../../src/modules/obo/professionals/professional.routes.js', import.meta.url),
  submissionAppointmentService: new URL('../../../../src/modules/obo/submission-appointments/submission-appointment.service.js', import.meta.url),
  submissionAppointmentRepository: new URL('../../../../src/modules/obo/submission-appointments/submission-appointment.repository.js', import.meta.url),
  appointmentService: new URL('../../../../src/features/appointments/appointment.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

const controllerPaths = [
  paths.planPermitController,
  paths.permitTypeController,
  paths.professionalController,
  paths.receivingController,
  paths.submissionAppointmentController,
]

describe('Phase 17 OBO layering boundary contract', () => {
  it('keeps OBO controllers free of persistence dependencies', async () => {
    for (const path of controllerPaths) {
      const source = await readText(path)
      expect(source).not.toMatch(/infrastructure\/database\/prisma\.js/)
      expect(source).not.toMatch(/\.\/.*\.repository\.js/)
      expect(source).toContain("successResponse")
    }
  })

  it('keeps professional authorization resource loading behind the service layer', async () => {
    const routes = await readText(paths.professionalRoutes)

    expect(routes).toContain("import * as service from './professional.service.js'")
    expect(routes).toContain('service.getForAuthorization')
    expect(routes).not.toContain("import * as repository from './professional.repository.js'")
  })

  it('keeps submission appointment persistence in its own OBO repository', async () => {
    const service = await readText(paths.submissionAppointmentService)
    const repository = await readText(paths.submissionAppointmentRepository)

    expect(service).toContain("./submission-appointment.repository.js")
    expect(service).toContain("../plan-permits/plan-permit.service.js")
    expect(service).not.toContain("../plan-permits/plan-permit.repository.js")

    expect(repository).toContain('db.oboSubmissionAppointment.create')
    expect(repository).toContain('db.oboSubmissionAppointment.update')
    expect(repository).not.toContain('db.oboPermitApplication')
  })

  it('keeps appointment business semantics behind the appointment service', async () => {
    const service = await readText(paths.submissionAppointmentService)
    const appointmentService = await readText(paths.appointmentService)

    expect(service).toContain("../../../features/appointments/appointment.service.js")
    expect(service).toContain('appointmentService.bookAppointment')
    expect(service).toContain('appointmentService.cancelAppointment')
    expect(service).not.toMatch(/db\.appointment(?:Type|Slot)?\s*\./)

    expect(appointmentService).toContain('const bookAppointment')
    expect(appointmentService).toContain('const cancelAppointment')
  })
})

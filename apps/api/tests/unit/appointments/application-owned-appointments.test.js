import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../')
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

describe('application-owned appointment architecture', () => {
  it('keeps the shared appointment feature routeless', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/features/appointments/appointment.routes.js'))).toBe(false)
  })

  it('places the OBO appointment HTTP adapter under the OBO application', () => {
    const routePath = path.join(ROOT, 'src/apps/obo/appointments/appointment.routes.js')
    expect(fs.existsSync(routePath)).toBe(true)
    expect(read('src/apps/obo/appointments/appointment.routes.js')).toContain("authorize('obo_appointments'")
  })

  it('does not expose a global appointment router', () => {
    const routes = read('src/routes/index.js')
    expect(routes).not.toContain("features/appointments/appointment.routes.js")
    expect(routes).not.toMatch(/router\.use\(['\"]\/appointments['\"]/) 
  })

  it('keeps shared appointments independent from application code and authorization', () => {
    const featureFiles = fs
      .readdirSync(path.join(ROOT, 'src/features/appointments'))
      .filter((file) => file.endsWith('.js'))

    for (const file of featureFiles) {
      const source = read(`src/features/appointments/${file}`)
      expect(source).not.toMatch(/(?:\.\.\/)+apps\//)
      expect(source).not.toMatch(/(?:\.\.\/)+platform\/authorization\//)
    }
  })
})

describe('appointment application scoping', () => {
  it('requires appId before shared appointment service access', async () => {
    vi.resetModules()
    vi.doMock('../../../src/platform/audit/audit.service.js', () => ({
      recordAudit: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    }))
    vi.doMock('../../../src/features/appointments/appointment.repository.js', () => ({
      listAppointmentTypes: vi.fn(),
    }))

    const repository = await import('../../../src/features/appointments/appointment.repository.js')
    const { listAppointmentTypes } = await import('../../../src/features/appointments/appointment.service.js')

    expect(() => listAppointmentTypes({ active: true })).toThrow('Application context is required.')
    expect(repository.listAppointmentTypes).not.toHaveBeenCalled()
  })

  it('passes the owning appId into appointment type queries', async () => {
    vi.resetModules()
    vi.doMock('../../../src/platform/audit/audit.service.js', () => ({
      recordAudit: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    }))
    vi.doMock('../../../src/features/appointments/appointment.repository.js', () => ({
      listAppointmentTypes: vi.fn().mockResolvedValue([]),
    }))

    const repository = await import('../../../src/features/appointments/appointment.repository.js')
    const { listAppointmentTypes } = await import('../../../src/features/appointments/appointment.service.js')

    await expect(listAppointmentTypes({ appId: 'obo-app', active: true })).resolves.toEqual([])
    expect(repository.listAppointmentTypes).toHaveBeenCalledWith({ appId: 'obo-app', active: true })
  })
})

describe('OBO appointment authorization', () => {
  it('uses OBO-specific appointment capabilities instead of generic appointment permissions', () => {
    const route = read('src/apps/obo/appointments/appointment.routes.js')

    expect(route).toContain("authorize('obo_appointments', 'read')")
    expect(route).toContain("authorize('obo_appointments', 'create')")
    expect(route).toContain("authorizeAppointmentResource('cancel')")
    expect(route).not.toMatch(/authorize(?:OBO)?\(['\"]appointments['\"]/) 
  })

  it('uses app-scoped resource loading for appointment authorization', () => {
    const route = read('src/apps/obo/appointments/appointment.routes.js')
    expect(route).toContain('repository.findAppointment(id, req.security.app.id)')
    expect(route).toContain("resource: 'obo_appointments'")
  })
})

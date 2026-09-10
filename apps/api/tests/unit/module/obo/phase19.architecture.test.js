import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  receivingRoutes: new URL('../../../../src/modules/obo/receiving/receiving.routes.js', import.meta.url),
  receivingService: new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url),
  professionalService: new URL('../../../../src/modules/obo/professionals/professional.service.js', import.meta.url),
  professionalReferenceService: new URL('../../../../src/modules/obo/plan-permits/professional-reference.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('Phase 19 OBO service boundary contract', () => {
  it('keeps receiving resource authorization loading behind the receiving service', async () => {
    const routes = await readText(paths.receivingRoutes)
    const service = await readText(paths.receivingService)

    expect(routes).toContain("import * as service from './receiving.service.js'")
    expect(routes).toContain('service.getForAuthorization')
    expect(routes).not.toContain("import * as repository from './receiving.repository.js'")
    expect(service).toContain('const getForAuthorization = (id) => repository.findApplication(id)')
  })

  it('keeps professional reference resolution behind the professional service', async () => {
    const service = await readText(paths.professionalReferenceService)
    const professionalService = await readText(paths.professionalService)

    expect(service).toContain("import * as professionalService from '../professionals/professional.service.js'")
    expect(service).toContain('getProfessional = professionalService.getForReference')
    expect(service).not.toContain("../professionals/professional.repository.js")
    expect(professionalService).toContain('const getForReference = (id) => repository.findById(id)')
  })
})

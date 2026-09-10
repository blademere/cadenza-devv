import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  schema: new URL('../../../../prisma/modules/obo/application-documents.prisma', import.meta.url),
  platformDocuments: new URL('../../../../prisma/platform/documents.prisma', import.meta.url),
  platformUsers: new URL('../../../../prisma/platform/users.prisma', import.meta.url),
  migration: new URL('../../../../prisma/migrations/20260910110000_add_obo_application_documents/migration.sql', import.meta.url),
  receivingService: new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url),
  applicationDocumentService: new URL('../../../../src/modules/obo/application-documents/application-document.service.js', import.meta.url),
  applicationDocumentRepository: new URL('../../../../src/modules/obo/application-documents/application-document.repository.js', import.meta.url),
  documentRequirementService: new URL('../../../../src/platform/documents/document-requirement.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('Phase 21 OBO hard-copy document checklist contract', () => {
  it('stores application-document associations separately from generic documents', async () => {
    const schema = await readText(paths.schema)

    expect(schema).toContain('model OboPermitApplicationDocument')
    expect(schema).toContain('applicationId')
    expect(schema).toContain('requirementId')
    expect(schema).toContain('documentId')
    expect(schema).toContain('@@unique([applicationId, requirementId])')
    expect(schema).toContain('application      OboPermitApplication')
    expect(schema).not.toContain('requirement     DocumentRequirement')
    expect(schema).not.toContain('document        Document')
    expect(schema).not.toContain('@relation("OboApplicationDocumentReceivedBy")')
    expect(schema).not.toContain('@relation("OboApplicationDocumentVerifiedBy")')
  })

  it('keeps platform document models independent from the OBO association', async () => {
    const documents = await readText(paths.platformDocuments)
    const users = await readText(paths.platformUsers)

    expect(documents).not.toContain('OboPermitApplicationDocument')
    expect(users).not.toContain('OboPermitApplicationDocument')
  })

  it('does not create cross-context foreign keys for platform document or user references', async () => {
    const migration = await readText(paths.migration)

    expect(migration).toContain('OboPermitApplicationDocument_applicationId_fkey')
    expect(migration).not.toContain('OboPermitApplicationDocument_requirementId_fkey')
    expect(migration).not.toContain('OboPermitApplicationDocument_documentId_fkey')
    expect(migration).not.toContain('OboPermitApplicationDocument_receivedByUserId_fkey')
    expect(migration).not.toContain('OboPermitApplicationDocument_verifiedByUserId_fkey')
  })

  it('keeps requirement resolution behind the Platform document requirement service', async () => {
    const source = await readText(paths.applicationDocumentService)
    const repository = await readText(paths.applicationDocumentRepository)

    expect(source).toContain("document-requirement.service.js")
    expect(source).not.toContain('db.documentRequirement.')
    expect(repository).not.toContain('documentRequirement')
    expect(repository).not.toContain('include:')
  })

  it('keeps checklist persistence in its own OBO repository', async () => {
    const source = await readText(paths.applicationDocumentService)
    const receiving = await readText(paths.receivingService)

    expect(source).toContain("./application-document.repository.js")
    expect(receiving).toContain("../application-documents/application-document.service.js")
    expect(receiving).not.toContain("../application-documents/application-document.repository.js")
  })

  it('enforces required documents before accepting an application for inspection', async () => {
    const source = await readText(paths.receivingService)

    expect(source).toContain('validateRequiredDocuments')
    expect(source).toMatch(/if \(accepted\) await applicationDocumentService\.validateRequiredDocuments\(\{ applicationId: id \}\)/)
  })

  it('exposes form-version document requirements through the Platform service boundary', async () => {
    const source = await readText(paths.documentRequirementService)

    expect(source).toContain('listForFormVersion')
  })
})

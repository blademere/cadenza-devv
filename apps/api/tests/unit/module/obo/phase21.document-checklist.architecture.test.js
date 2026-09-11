import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  schema: new URL('../../../../prisma/modules/obo/application-documents.prisma', import.meta.url),
  requirements: new URL('../../../../prisma/platform/requirements.prisma', import.meta.url),
  documents: new URL('../../../../prisma/platform/documents.prisma', import.meta.url),
  migration: new URL('../../../../prisma/migrations/20260910120000_link_obo_documents_to_case_requirements/migration.sql', import.meta.url),
  receivingService: new URL('../../../../src/modules/obo/receiving/receiving.service.js', import.meta.url),
  applicationDocumentService: new URL('../../../../src/modules/obo/application-documents/application-document.service.js', import.meta.url),
  applicationDocumentRepository: new URL('../../../../src/modules/obo/application-documents/application-document.repository.js', import.meta.url),
  requirementService: new URL('../../../../src/features/requirements/requirements.service.js', import.meta.url),
  documentService: new URL('../../../../src/features/documents/document.service.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('OBO hard-copy document checklist architecture', () => {
  it('links the OBO receiving record to a shared CaseRequirement and Document', async () => {
    const schema = await readText(paths.schema)

    expect(schema).toContain('model OboPermitApplicationDocument')
    expect(schema).toContain('caseRequirementId')
    expect(schema).toContain('documentId')
    expect(schema).toContain('@@unique([applicationId, caseRequirementId])')
    expect(schema).toContain('caseRequirement   CaseRequirement')
    expect(schema).toContain('document          Document?')
    expect(schema).not.toContain('requirementId    String')
    expect(schema).not.toContain('requirement      DocumentRequirement')
  })

  it('defines the reverse relations on the shared requirement and document models', async () => {
    const requirements = await readText(paths.requirements)
    const documents = await readText(paths.documents)

    expect(requirements).toContain('applicationDocuments OboPermitApplicationDocument[]')
    expect(documents).toContain('oboApplicationDocuments OboPermitApplicationDocument[]')
  })

  it('migrates legacy checklist associations into CaseRequirement associations and adds the shared Document FK', async () => {
    const migration = await readText(paths.migration)

    expect(migration).toContain('ADD COLUMN "caseRequirementId" TEXT')
    expect(migration).toContain('DocumentRequirement')
    expect(migration).toContain('RequirementDefinition')
    expect(migration).toContain('OboPermitApplicationDocument_caseRequirementId_fkey')
    expect(migration).toContain('OboPermitApplicationDocument_documentId_fkey')
    expect(migration).toContain('DROP COLUMN "requirementId"')
  })

  it('resolves checklist requirements through the shared Requirements feature', async () => {
    const source = await readText(paths.applicationDocumentService)
    const requirementService = await readText(paths.requirementService)

    expect(source).toContain("features/requirements/requirements.service.js")
    expect(source).toContain('requirementService.listForCase')
    expect(source).not.toContain('document-requirement.service.js')
    expect(requirementService).toContain('listForCase')
  })

  it('uses the shared Documents feature to validate attached documents', async () => {
    const source = await readText(paths.applicationDocumentService)
    const documentService = await readText(paths.documentService)

    expect(source).toContain("features/documents/document.service.js")
    expect(source).toContain('documentService.getOwnedDocument')
    expect(documentService).toContain('uploadDocument')
  })

  it('keeps OBO receiving state in the OBO association record', async () => {
    const schema = await readText(paths.schema)
    const source = await readText(paths.applicationDocumentService)

    expect(schema).toContain('status            String')
    expect(source).toContain('RECEIVED')
    expect(source).toContain('VERIFIED')
    expect(source).toContain('REJECTED')
  })

  it('keeps checklist persistence behind the OBO repository boundary', async () => {
    const source = await readText(paths.applicationDocumentService)
    const repository = await readText(paths.applicationDocumentRepository)
    const receiving = await readText(paths.receivingService)

    expect(source).toContain("./application-document.repository.js")
    expect(receiving).toContain("../application-documents/application-document.service.js")
    expect(receiving).not.toContain("../application-documents/application-document.repository.js")
    expect(repository).toContain('withTransaction')
  })

  it('enforces verified required documents before accepting an application for inspection', async () => {
    const source = await readText(paths.receivingService)
    const documentService = await readText(paths.applicationDocumentService)

    expect(source).toContain('applicationDocumentService.validateRequiredDocuments')
    expect(source).toMatch(/validateRequiredDocuments\(\{\s*applicationId: id, application, db: tx\s*\}\)/)
    expect(documentService).toContain("status !== STATUS.VERIFIED")
  })
})
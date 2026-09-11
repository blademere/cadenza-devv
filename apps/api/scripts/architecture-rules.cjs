const path = require('node:path')

const FORBIDDEN_PLATFORM_IMPORT = /(?:\.\.\/)+(?:features|modules)\//
const FORBIDDEN_FEATURE_IMPORT = /(?:\.\.\/)+modules\//
const FORBIDDEN_INFRASTRUCTURE_IMPORT = /(?:\.\.\/)+modules\//
const FORBIDDEN_COMMON_IMPORT = /(?:\.\.\/)+(?:features|platform|modules)\//
const PRISMA_IMPORT = new RegExp(String.raw`(?:\.\./)+infrastructure/database/prisma(?:['"]|/|$)`)
const PRISMA_CLIENT_ACCESS = /\b(?:getPrismaClient|PrismaClient)\s*\(/

const PLATFORM_PRISMA_LEGACY_EXCEPTIONS = new Set()

const normalizeRelativePath = (file) => path.relative(process.cwd(), file).replaceAll(path.sep, '/')
const isApplicationService = (relative) => (relative.startsWith('apps/api/src/features/') || relative.startsWith('apps/api/src/modules/') || relative.startsWith('apps/api/src/platform/')) && /(?:^|\/)\w+(?:\.query)?\.service\.(?:js|cjs|mjs)$/.test(relative)
const hasDirectPrismaAccess = (source) => PRISMA_IMPORT.test(source) || PRISMA_CLIENT_ACCESS.test(source)
const isPlatformPrismaLegacyException = (relative) => PLATFORM_PRISMA_LEGACY_EXCEPTIONS.has(relative)
const getLayerViolations = (relative, source) => {
  const failures = []
  if (relative.startsWith('apps/api/src/platform/') && FORBIDDEN_PLATFORM_IMPORT.test(source)) failures.push(`${relative}: platform code must not import features or modules.`)
  if (relative.startsWith('apps/api/src/features/') && FORBIDDEN_FEATURE_IMPORT.test(source)) failures.push(`${relative}: shared features must not import modules.`)
  if (relative.startsWith('apps/api/src/infrastructure/') && FORBIDDEN_INFRASTRUCTURE_IMPORT.test(source)) failures.push(`${relative}: infrastructure must not import modules.`)
  if (relative.startsWith('apps/api/src/common/') && FORBIDDEN_COMMON_IMPORT.test(source)) failures.push(`${relative}: common code must not import features, platform, or modules.`)
  if (relative.startsWith('apps/api/src/platform/') && isApplicationService(relative) && hasDirectPrismaAccess(source) && !isPlatformPrismaLegacyException(relative)) failures.push(`${relative}: platform services must not access Prisma directly; use a repository or explicit infrastructure boundary.`)
  return failures
}

module.exports = { FORBIDDEN_PLATFORM_IMPORT, FORBIDDEN_FEATURE_IMPORT, FORBIDDEN_INFRASTRUCTURE_IMPORT, FORBIDDEN_COMMON_IMPORT, PRISMA_IMPORT, PRISMA_CLIENT_ACCESS, PLATFORM_PRISMA_LEGACY_EXCEPTIONS, normalizeRelativePath, isApplicationService, hasDirectPrismaAccess, isPlatformPrismaLegacyException, getLayerViolations }

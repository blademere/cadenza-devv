import { seedApplication } from './applications.js'

const APPLICATIONS = ['obo', 'cadenza', 'cadenza-web', 'cadenza-client']

async function seedPlatform(prisma, { applications: requestedApplications = APPLICATIONS } = {}) {
  const applications = {}
  for (const key of requestedApplications) {
    if (!APPLICATIONS.includes(key)) {
      throw new Error(`Unknown platform application '${key}'. Expected one of: ${APPLICATIONS.join(', ')}.`)
    }
    applications[key] = await seedApplication(prisma, key)
  }

  const module = await prisma.module.upsert({
    where: { key: 'audit_logs' },
    update: { name: 'Audit Logs', isActive: true },
    create: { key: 'audit_logs', name: 'Audit Logs', isActive: true },
  })
  const permission = await prisma.permission.upsert({
    where: { moduleId_action: { moduleId: module.id, action: 'read' } },
    update: {},
    create: { moduleId: module.id, action: 'read' },
  })
  return { applications, permissionRecords: new Map([['audit_logs:read', permission]]) }
}

export { APPLICATIONS, seedPlatform }

import { seedApplication } from './applications.js'

const APPLICATIONS = ['obo', 'cadenza']

async function seedPlatform(prisma) {
  const applications = {}
  for (const key of APPLICATIONS) {
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

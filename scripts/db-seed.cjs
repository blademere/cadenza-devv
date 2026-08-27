#!/usr/bin/env node

require('dotenv').config()
const bcrypt = require('bcrypt')
const {
  getPrismaClient,
  disconnectPrisma,
} = require('../apps/server/src/infrastructure/database/prisma')
const prisma = getPrismaClient()

// Canonical application authorization catalog. Modules and permissions are
// developer-owned capabilities; the Admin Web manages role assignments.
const authorizationCatalog = {
  authorization: ['manage'],
  users: ['read', 'create', 'manage'],
  applications: ['read', 'create', 'update', 'review', 'receive', 'approve', 'reject'],
  appointments: ['read', 'create', 'cancel', 'check_in', 'manage'],
  obo_clients: ['read', 'create'],
  obo_plan_permits: ['read', 'create', 'update', 'submit', 'schedule_submission', 'receive'],
  obo_professionals: ['read', 'create', 'update', 'review'],
}

const rolePermissions = {
  client: ['applications:read','applications:create','applications:update','appointments:read','appointments:create','appointments:cancel','obo_clients:read','obo_clients:create','obo_plan_permits:read','obo_plan_permits:create','obo_plan_permits:update','obo_plan_permits:submit','obo_plan_permits:schedule_submission','obo_professionals:read'],
  professional: ['applications:read','applications:create','applications:update','appointments:read','obo_plan_permits:read','obo_professionals:create','obo_professionals:read','obo_professionals:update'],
  receiving_officer: ['applications:read','applications:review','applications:receive','applications:approve','applications:reject','appointments:read','appointments:check_in','appointments:manage','obo_plan_permits:read','obo_plan_permits:receive','obo_professionals:read','obo_professionals:review'],
  admin: ['authorization:manage','users:read','users:create','users:manage'],
}

const catalogPermissionKeys = Object.entries(authorizationCatalog).flatMap(([moduleKey, actions]) => actions.map((action) => `${moduleKey}:${action}`))
const permissionKeys = [...new Set(catalogPermissionKeys)]
const catalogPermissionSet = new Set(permissionKeys)
for (const [roleName, keys] of Object.entries(rolePermissions)) for (const key of keys) if (!catalogPermissionSet.has(key)) throw new Error(`Role '${roleName}' references permission outside the authorization catalog: ${key}`)

const moduleName = (key) => key.split(/[_-]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

const OBO_WORKFLOW = {
  key: 'obo_plan_permit', name: 'OBO Plan Permit Application', description: 'Lifecycle workflow for an OBO plan permit application.',
  steps: [
    { key: 'DRAFT', name: 'Draft', isInitial: true, isFinal: false, sortOrder: 0 },
    { key: 'READY_FOR_SUBMISSION', name: 'Ready for Submission', isInitial: false, isFinal: false, sortOrder: 1 },
    { key: 'SUBMISSION_SCHEDULED', name: 'Submission Scheduled', isInitial: false, isFinal: false, sortOrder: 2 },
    { key: 'RECEIVING', name: 'Receiving', isInitial: false, isFinal: false, sortOrder: 3 },
    { key: 'DECLINED', name: 'Declined', isInitial: false, isFinal: true, sortOrder: 4 },
    { key: 'FOR_INSPECTION', name: 'For Inspection', isInitial: false, isFinal: true, sortOrder: 5 },
  ],
  transitions: [
    { key: 'SUBMIT_FOR_SUBMISSION', name: 'Submit for Submission', fromStepKey: 'DRAFT', toStepKey: 'READY_FOR_SUBMISSION', permissionKey: 'obo_plan_permits:submit' },
    { key: 'SCHEDULE_SUBMISSION', name: 'Schedule Hardcopy Submission', fromStepKey: 'READY_FOR_SUBMISSION', toStepKey: 'SUBMISSION_SCHEDULED', permissionKey: 'obo_plan_permits:schedule_submission' },
    { key: 'RECEIVE_HARDCOPY', name: 'Receive Hardcopy', fromStepKey: 'SUBMISSION_SCHEDULED', toStepKey: 'RECEIVING', permissionKey: 'obo_plan_permits:receive' },
    { key: 'DECLINE', name: 'Decline Application', fromStepKey: 'RECEIVING', toStepKey: 'DECLINED', permissionKey: 'obo_plan_permits:receive' },
    { key: 'ACCEPT_FOR_INSPECTION', name: 'Accept for Inspection', fromStepKey: 'RECEIVING', toStepKey: 'FOR_INSPECTION', permissionKey: 'obo_plan_permits:receive' },
  ],
}

async function seedOboWorkflow() {
  const workflow = await prisma.workflow.upsert({ where: { key: OBO_WORKFLOW.key }, update: { name: OBO_WORKFLOW.name, description: OBO_WORKFLOW.description, isActive: true }, create: { key: OBO_WORKFLOW.key, name: OBO_WORKFLOW.name, description: OBO_WORKFLOW.description } })
  const version = await prisma.workflowVersion.upsert({ where: { workflowId_version: { workflowId: workflow.id, version: 1 } }, update: { status: 'PUBLISHED' }, create: { workflowId: workflow.id, version: 1, status: 'PUBLISHED', steps: { create: OBO_WORKFLOW.steps } }, include: { steps: true } })
  const steps = await prisma.workflowStep.findMany({ where: { workflowVersionId: version.id } }); const stepByKey = new Map(steps.map((step) => [step.key, step]))
  for (const transition of OBO_WORKFLOW.transitions) {
    const fromStep = stepByKey.get(transition.fromStepKey); const toStep = stepByKey.get(transition.toStepKey)
    if (!fromStep || !toStep) throw new Error(`OBO workflow transition '${transition.key}' references an unknown step.`)
    await prisma.workflowTransition.upsert({ where: { workflowVersionId_key: { workflowVersionId: version.id, key: transition.key } }, update: { fromStepId: fromStep.id, toStepId: toStep.id, name: transition.name, description: transition.description || null, permissionKey: transition.permissionKey || null }, create: { workflowVersionId: version.id, fromStepId: fromStep.id, toStepId: toStep.id, key: transition.key, name: transition.name, description: transition.description || null, permissionKey: transition.permissionKey || null } })
  }
}

async function seedOboNotifications() {
  const statuses = [
    ['READY_FOR_SUBMISSION', 'Ready for Submission', 'Your {{metadata.permitTypeName}} application {{metadata.referenceNumber}} is ready for hardcopy submission.'],
    ['SUBMISSION_SCHEDULED', 'Submission Scheduled', 'Your {{metadata.permitTypeName}} application {{metadata.referenceNumber}} has been scheduled for hardcopy submission.'],
    ['RECEIVING', 'Application Received', 'Your {{metadata.permitTypeName}} application {{metadata.referenceNumber}} has been received by OBO.'],
    ['DECLINED', 'Application Declined', 'Your {{metadata.permitTypeName}} application {{metadata.referenceNumber}} was declined. Reason: {{metadata.reason}}'],
    ['FOR_INSPECTION', 'For Inspection', 'Your {{metadata.permitTypeName}} application {{metadata.referenceNumber}} has been accepted for inspection.'],
  ]
  for (const [status, label, body] of statuses) {
    const keyBase = `obo.application.${status.toLowerCase()}`
    const event = status === 'DECLINED' || status === 'FOR_INSPECTION' ? 'workflow.completed' : 'workflow.transitioned'
    const conditions = { all: [{ field: 'workflowKey', operator: 'equals', value: 'obo_plan_permit' }, { field: 'workflowStepKey', operator: 'equals', value: status }] }
    for (const channel of ['IN_APP', 'EMAIL']) {
      const templateKey = `${keyBase}.${channel.toLowerCase()}`
      const template = await prisma.notificationTemplate.upsert({ where: { key: templateKey }, update: { name: `OBO Application ${label} (${channel})`, channel, subject: channel === 'EMAIL' ? `OBO Application — ${label}` : null, body, active: true }, create: { key: templateKey, name: `OBO Application ${label} (${channel})`, channel, subject: channel === 'EMAIL' ? `OBO Application — ${label}` : null, body, active: true } })
      await prisma.notificationRule.upsert({ where: { key: `${keyBase}.${channel.toLowerCase()}.rule` }, update: { name: `OBO Application ${label} (${channel})`, event, entityType: 'OboPermitApplication', active: true, priority: 50, conditions, templateId: template.id, recipientType: 'FIELD', recipientValue: channel === 'EMAIL' ? 'metadata.clientEmail' : 'metadata.clientUserId' }, create: { key: `${keyBase}.${channel.toLowerCase()}.rule`, name: `OBO Application ${label} (${channel})`, event, entityType: 'OboPermitApplication', priority: 50, conditions, templateId: template.id, recipientType: 'FIELD', recipientValue: channel === 'EMAIL' ? 'metadata.clientEmail' : 'metadata.clientUserId' } })
    }
  }
  for (const [decision, label, body, subject] of [['ACCEPTED', 'Professional Verification Approved', 'Your professional registration {{registrationNumber}} has been verified.', 'Your professional verification has been approved.'], ['DECLINED', 'Professional Verification Declined', 'Your professional registration {{registrationNumber}} was not verified. Reason: {{reason}}', 'Your professional verification was declined.']]) {
    const conditions = { field: 'decision', operator: 'equals', value: decision }
    for (const channel of ['IN_APP', 'EMAIL']) {
      const templateKey = `obo.professional.verification.${decision.toLowerCase()}.${channel.toLowerCase()}`
      const template = await prisma.notificationTemplate.upsert({ where: { key: templateKey }, update: { name: `${label} (${channel})`, channel, subject: channel === 'EMAIL' ? subject : null, body, active: true }, create: { key: templateKey, name: `${label} (${channel})`, channel, subject: channel === 'EMAIL' ? subject : null, body, active: true } })
      await prisma.notificationRule.upsert({ where: { key: `${templateKey}.rule` }, update: { name: `${label} (${channel})`, event: 'obo.professional.verification.decided', entityType: 'OboProfessional', active: true, priority: 50, conditions, templateId: template.id, recipientType: 'FIELD', recipientValue: channel === 'EMAIL' ? 'professionalEmail' : 'professionalUserId' }, create: { key: `${templateKey}.rule`, name: `${label} (${channel})`, event: 'obo.professional.verification.decided', entityType: 'OboProfessional', priority: 50, conditions, templateId: template.id, recipientType: 'FIELD', recipientValue: channel === 'EMAIL' ? 'professionalEmail' : 'professionalUserId' } })
    }
  }
}

async function seed() {
  const moduleRecords = new Map(); const permissionRecords = new Map()
  for (const [moduleKey, actions] of Object.entries(authorizationCatalog)) {
    const module = await prisma.module.upsert({ where: { key: moduleKey }, update: { name: moduleName(moduleKey), isActive: true }, create: { key: moduleKey, name: moduleName(moduleKey), isActive: true } })
    moduleRecords.set(moduleKey, module)
    for (const action of actions) {
      const permission = await prisma.permission.upsert({ where: { moduleId_action: { moduleId: module.id, action } }, update: {}, create: { moduleId: module.id, action } })
      permissionRecords.set(`${moduleKey}:${action}`, permission)
    }
  }

  const roles = {
    client: await prisma.role.upsert({ where: { name: 'client' }, update: { description: 'Client who creates permit applications and schedules hardcopy submission appointments.' }, create: { name: 'client', description: 'Client who creates permit applications and schedules hardcopy submission appointments.' } }),
    professional: await prisma.role.upsert({ where: { name: 'professional' }, update: { description: 'Registered professional who applies for verification and is associated with permit applications.' }, create: { name: 'professional', description: 'Registered professional who applies for verification and is associated with permit applications.' } }),
    receiving_officer: await prisma.role.upsert({ where: { name: 'receiving_officer' }, update: { description: 'Receiving officer who verifies professionals and receives permit applications.' }, create: { name: 'receiving_officer', description: 'Receiving officer who verifies professionals and receives permit applications.' } }),
    admin: await prisma.role.upsert({ where: { name: 'admin' }, update: { description: 'Platform administrator with full authorization administration access.' }, create: { name: 'admin', description: 'Platform administrator with full authorization administration access.' } }),
  }

  // Role permissions are managed by the Admin Web. Seeding creates the
  // canonical catalog and only ensures the declared baseline assignments exist;
  // it must never grant every catalog permission back to admin.
  for (const [roleName, keys] of Object.entries(rolePermissions)) for (const key of keys) {
    const permission = permissionRecords.get(key); if (!permission) throw new Error(`Unknown permission declared for ${roleName}: ${key}`)
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles[roleName].id, permissionId: permission.id } }, update: {}, create: { roleId: roles[roleName].id, permissionId: permission.id } })
  }

  await prisma.oboPermitType.upsert({ where: { key: 'building-plan-permit' }, update: { name: 'Building Plan Permit', isActive: true }, create: { key: 'building-plan-permit', name: 'Building Plan Permit', description: 'Plan permit application for building construction and related work.' } })
  await prisma.appointmentType.upsert({ where: { key: 'obo-hardcopy-submission' }, update: { name: 'OBO Hardcopy Submission', isActive: true }, create: { key: 'obo-hardcopy-submission', name: 'OBO Hardcopy Submission', description: 'Physical hardcopy submission appointment for an OBO permit application.', defaultDurationMinutes: 30, defaultCapacity: 1 } })
  await seedOboWorkflow(); await seedOboNotifications()
  const adminEmail = process.env.SEED_ADMIN_EMAIL; const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) { const passwordHash = await bcrypt.hash(adminPassword, 12); await prisma.user.upsert({ where: { email: adminEmail }, update: { roleId: roles.admin.id, isActive: true }, create: { email: adminEmail, passwordHash, roleId: roles.admin.id, isActive: true } }); console.log(`Development admin ensured: ${adminEmail}`) } else console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
  console.log(`Seeded ${moduleRecords.size} canonical modules, ${permissionRecords.size} canonical permissions, baseline role assignments, OBO plan permit type, appointment type, workflow, notification templates/rules, and application roles.`)
}
seed().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })
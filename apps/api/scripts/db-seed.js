#!/usr/bin/env node

import 'dotenv/config'
import bcrypt from 'bcrypt'
import { seedModelCoverage } from './seed-model-coverage.js'
import { seedAuthorization } from './seed/authorization.js'
import { seedOboDevelopmentScenario } from './seed/obo.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const prisma = getPrismaClient()

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

async function seedDevelopmentAdmin(roles) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
    return null
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.upsert({ where: { email: adminEmail }, update: { roleId: roles.admin.id, isActive: true }, create: { email: adminEmail, passwordHash, roleId: roles.admin.id, isActive: true } })
  console.log(`Development admin ensured: ${adminEmail}`)
  return admin
}

async function seed() {
  const { roles, permissionRecords } = await seedAuthorization(prisma)
  const demoPasswordHash = process.env.SEED_DEMO_PASSWORD ? await bcrypt.hash(process.env.SEED_DEMO_PASSWORD, 12) : null

  await prisma.oboPermitType.upsert({ where: { key: 'building-plan-permit' }, update: { name: 'Building Plan Permit', isActive: true }, create: { key: 'building-plan-permit', name: 'Building Plan Permit', description: 'Plan permit application for building construction and related work.' } })
  await prisma.appointmentType.upsert({ where: { key: 'obo-hardcopy-submission' }, update: { name: 'OBO Hardcopy Submission', isActive: true }, create: { key: 'obo-hardcopy-submission', name: 'OBO Hardcopy Submission', description: 'Physical hardcopy submission appointment for an OBO permit application.', defaultDurationMinutes: 30, defaultCapacity: 1 } })
  await seedOboDevelopmentScenario(prisma, { roles, passwordHash: demoPasswordHash })
  await seedOboNotifications()
  await seedDevelopmentAdmin(roles)
  await seedModelCoverage(prisma)

  console.log(`Seed complete: ${permissionRecords.size} canonical permissions, baseline roles, OBO reference/workflow/notification fixtures, deterministic OBO development scenario, and verified complete Prisma model coverage.`)
}

async function main() {
  await seed()
}

main().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })

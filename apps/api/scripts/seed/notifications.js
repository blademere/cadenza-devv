async function seedOboNotifications(prisma) {
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

  for (const [decision, label, body, subject] of [
    ['ACCEPTED', 'Professional Verification Approved', 'Your professional registration {{registrationNumber}} has been verified.', 'Your professional verification has been approved.'],
    ['DECLINED', 'Professional Verification Declined', 'Your professional registration {{registrationNumber}} was not verified. Reason: {{reason}}', 'Your professional verification was declined.'],
  ]) {
    const conditions = { field: 'decision', operator: 'equals', value: decision }
    for (const channel of ['IN_APP', 'EMAIL']) {
      const templateKey = `obo.professional.verification.${decision.toLowerCase()}.${channel.toLowerCase()}`
      const template = await prisma.notificationTemplate.upsert({ where: { key: templateKey }, update: { name: `${label} (${channel})`, channel, subject: channel === 'EMAIL' ? subject : null, body, active: true }, create: { key: templateKey, name: `${label} (${channel})`, channel, subject: channel === 'EMAIL' ? subject : null, body, active: true } })
      await prisma.notificationRule.upsert({ where: { key: `${templateKey}.rule` }, update: { name: `${label} (${channel})`, event: 'obo.professional.verification.decided', entityType: 'OboProfessional', active: true, priority: 50, conditions, templateId: template.id, recipientType: 'FIELD', recipientValue: channel === 'EMAIL' ? 'professionalEmail' : 'professionalUserId' }, create: { key: `${templateKey}.rule`, name: `${label} (${channel})`, event: 'obo.professional.verification.decided', entityType: 'OboProfessional', priority: 50, conditions, templateId: template.id, recipientType: 'FIELD', recipientValue: channel === 'EMAIL' ? 'professionalEmail' : 'professionalUserId' } })
    }
  }
}

export { seedOboNotifications }

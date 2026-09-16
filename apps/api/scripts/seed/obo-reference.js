const OBO_PERMIT_TYPE = {
  key: 'building-plan-permit',
  name: 'Building Plan Permit',
  description: 'Plan permit application for building construction and related work.',
}

const OBO_APPOINTMENT_TYPE = {
  key: 'obo-hardcopy-submission',
  name: 'OBO Hardcopy Submission',
  description: 'Physical hardcopy submission appointment for an OBO permit application.',
  defaultDurationMinutes: 30,
  defaultCapacity: 1,
}

async function seedOboReferenceData(prisma, { planPermitForm } = {}) {
  if (!planPermitForm?.id) throw new Error("Platform form 'obo-building-plan-permit' must be seeded before OBO reference data.")
  const oboApp = await prisma.app.findUnique({ where: { key: 'obo' } })
  if (!oboApp) throw new Error("Application 'obo' must be seeded before OBO reference data.")

  const permitType = await prisma.oboPermitType.upsert({
    where: { appId_key: { appId: oboApp.id, key: OBO_PERMIT_TYPE.key } },
    update: { name: OBO_PERMIT_TYPE.name, description: OBO_PERMIT_TYPE.description, formId: planPermitForm.id, isActive: true },
    create: { ...OBO_PERMIT_TYPE, appId: oboApp.id, formId: planPermitForm.id, isActive: true },
  })

  const appointmentType = await prisma.appointmentType.upsert({
    where: { key: OBO_APPOINTMENT_TYPE.key },
    update: {
      name: OBO_APPOINTMENT_TYPE.name,
      description: OBO_APPOINTMENT_TYPE.description,
      defaultDurationMinutes: OBO_APPOINTMENT_TYPE.defaultDurationMinutes,
      defaultCapacity: OBO_APPOINTMENT_TYPE.defaultCapacity,
      isActive: true,
      appId: oboApp.id,
    },
    create: { ...OBO_APPOINTMENT_TYPE, appId: oboApp.id, isActive: true },
  })

  return { permitType, appointmentType }
}

export { seedOboReferenceData }

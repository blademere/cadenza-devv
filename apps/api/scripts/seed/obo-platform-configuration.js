const OBO_FORM_KEY = 'obo-building-permit'
const OBO_FORM_VERSION = 1
const OBO_PERMIT_TYPE_KEY = 'building-permit'
const OBO_APPOINTMENT_TYPE_KEY = 'obo-hardcopy-submission'
const OBO_APPOINTMENT_REFERENCE = 'OBO-APPT-DEV-0001'
const OBO_SLOT_START = new Date('2030-06-14T09:00:00.000Z')

const DOCUMENT_TYPES = [
  { key: 'obo-building-plan', name: 'Building Plan', description: 'Building plan documents submitted for building permit processing.' },
  { key: 'obo-site-development-plan', name: 'Site Development Plan', description: 'Site development plan supporting the building building permit application.' },
  { key: 'obo-professional-credentials', name: 'Professional Credentials', description: 'Professional credential documents associated with the permit application.' },
]

const DOCUMENT_REQUIREMENTS = [
  { documentTypeKey: 'obo-building-plan', name: 'Building Plan', description: 'Building plan for the proposed construction.', required: true, allowedFileTypes: ['application/pdf'], source: 'CLIENT', sortOrder: 0 },
  { documentTypeKey: 'obo-site-development-plan', name: 'Site Development Plan', description: 'Site development plan for the project location.', required: true, allowedFileTypes: ['application/pdf'], source: 'CLIENT', sortOrder: 1 },
  { documentTypeKey: 'obo-professional-credentials', name: 'Professional Credentials', description: 'Professional credential documents for the registered professional.', required: true, allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'], source: 'CLIENT', sortOrder: 2 },
]

const FORM_FIELDS = [
  'projectName',
  'projectType',
  'address',
  'occupancyClassification',
  'floorAreaSqm',
  'storeys',
  'scopeOfWork',
  'estimatedCost',
]

const findOrCreateDocumentType = async (prisma, definition) => {
  const existing = await prisma.documentType.findUnique({ where: { key: definition.key } })
  if (existing) return prisma.documentType.update({ where: { id: existing.id }, data: { ...definition, isActive: true } })
  return prisma.documentType.create({ data: { ...definition, isActive: true } })
}

async function seedOboPlatformConfiguration(prisma) {
  const app = await prisma.app.findUnique({ where: { key: 'obo' } })
  if (!app) throw new Error("Application 'obo' must be seeded before OBO platform configuration.")

  const form = await prisma.form.findUnique({
    where: { appId_key: { appId: app.id, key: OBO_FORM_KEY } },
    include: { versions: { where: { version: OBO_FORM_VERSION }, take: 1 } },
  })
  if (!form?.isActive) throw new Error(`Active platform form '${OBO_FORM_KEY}' was not seeded.`)

  const formVersion = form.versions[0]
  if (!formVersion || formVersion.status !== 'PUBLISHED') throw new Error(`Published platform form '${OBO_FORM_KEY}' v${OBO_FORM_VERSION} was not seeded.`)

  const documentTypes = new Map()
  for (const definition of DOCUMENT_TYPES) {
    documentTypes.set(definition.key, await findOrCreateDocumentType(prisma, definition))
  }

  for (const requirement of DOCUMENT_REQUIREMENTS) {
    const documentType = documentTypes.get(requirement.documentTypeKey)
    const existing = await prisma.documentRequirement.findFirst({
      where: { formVersionId: formVersion.id, documentTypeId: documentType.id, name: requirement.name },
    })
    const data = {
      documentTypeId: documentType.id,
      formVersionId: formVersion.id,
      workflowVersionId: null,
      fieldKey: null,
      name: requirement.name,
      description: requirement.description,
      required: requirement.required,
      allowedFileTypes: requirement.allowedFileTypes,
      maxSizeBytes: 10 * 1024 * 1024,
      condition: null,
      source: requirement.source,
      sortOrder: requirement.sortOrder,
    }
    if (existing) await prisma.documentRequirement.update({ where: { id: existing.id }, data })
    else await prisma.documentRequirement.create({ data })
  }

  const appointmentType = await prisma.appointmentType.findUnique({ where: { appId_key: { appId: app.id, key: OBO_APPOINTMENT_TYPE_KEY } } })
  if (!appointmentType || !appointmentType.isActive) throw new Error(`Active appointment type '${OBO_APPOINTMENT_TYPE_KEY}' was not seeded.`)

  const scheduleDefinition = {
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '12:00',
    timezone: 'UTC',
    slotDurationMinutes: 30,
    capacity: 1,
    isActive: true,
  }
  let schedule = await prisma.availabilitySchedule.findFirst({ where: { appointmentTypeId: appointmentType.id, dayOfWeek: scheduleDefinition.dayOfWeek, startTime: scheduleDefinition.startTime, endTime: scheduleDefinition.endTime } })
  if (schedule) {
    schedule = await prisma.availabilitySchedule.update({ where: { id: schedule.id }, data: scheduleDefinition })
  } else {
    schedule = await prisma.availabilitySchedule.create({ data: { appointmentTypeId: appointmentType.id, ...scheduleDefinition } })
  }

  const slot = await prisma.appointmentSlot.findUnique({
    where: { appointmentTypeId_startsAt: { appointmentTypeId: appointmentType.id, startsAt: OBO_SLOT_START } },
  })
  if (!slot) throw new Error(`Development OBO appointment slot for '${OBO_APPOINTMENT_REFERENCE}' was not seeded.`)
  await prisma.appointmentSlot.update({ where: { id: slot.id }, data: { scheduleId: schedule.id, capacity: schedule.capacity } })

  console.log(`OBO platform configuration ensured: ${DOCUMENT_REQUIREMENTS.length} document requirements and Friday appointment availability.`)
  return { form, formVersion, documentTypes, appointmentType, schedule, slot }
}

const requireCondition = (condition, message) => {
  if (!condition) throw new Error(`OBO platform configuration verification failed: ${message}`)
}

async function verifyOboPlatformConfiguration(prisma) {
  const app = await prisma.app.findUnique({ where: { key: 'obo' } })
  requireCondition(app, "application 'obo' is missing.")

  const form = await prisma.form.findUnique({
    where: { appId_key: { appId: app.id, key: OBO_FORM_KEY } },
    include: {
      versions: {
        where: { version: OBO_FORM_VERSION },
        take: 1,
        include: {
          sections: true,
          fields: { include: { options: true } },
          documentRequirements: { include: { documentType: true } },
        },
      },
    },
  })
  requireCondition(form?.isActive, `active form '${OBO_FORM_KEY}' is missing.`)

  const formVersion = form?.versions[0]
  requireCondition(formVersion?.status === 'PUBLISHED', `form '${OBO_FORM_KEY}' v${OBO_FORM_VERSION} is not published.`)

  const fieldKeys = new Set((formVersion?.fields || []).map((field) => field.key))
  for (const key of FORM_FIELDS) requireCondition(fieldKeys.has(key), `form field '${key}' is missing.`)

  const permitType = await prisma.oboPermitType.findUnique({ where: { appId_key: { appId: app.id, key: OBO_PERMIT_TYPE_KEY } }, select: { id: true, isActive: true, formId: true, appId: true } })
  requireCondition(permitType?.isActive, `active OBO permit type '${OBO_PERMIT_TYPE_KEY}' is missing.`)
  requireCondition(permitType.appId === app.id, `permit type '${OBO_PERMIT_TYPE_KEY}' belongs to a different application.`)
  requireCondition(permitType.formId === form.id, `permit type '${OBO_PERMIT_TYPE_KEY}' is not linked to form '${OBO_FORM_KEY}'.`)

  const requirements = formVersion.documentRequirements || []
  requireCondition(requirements.length === DOCUMENT_REQUIREMENTS.length, `expected ${DOCUMENT_REQUIREMENTS.length} document requirements, found ${requirements.length}.`)
  for (const expected of DOCUMENT_REQUIREMENTS) {
    const actual = requirements.find((item) => item.documentType?.key === expected.documentTypeKey && item.name === expected.name)
    requireCondition(actual, `document requirement '${expected.name}' is missing.`)
    requireCondition(actual.required === expected.required, `document requirement '${expected.name}' required flag is incorrect.`)
    requireCondition(JSON.stringify(actual.allowedFileTypes) === JSON.stringify(expected.allowedFileTypes), `document requirement '${expected.name}' allowed file types are incorrect.`)
    requireCondition(actual.maxSizeBytes === BigInt(10 * 1024 * 1024), `document requirement '${expected.name}' max file size is incorrect.`)
  }

  const appointmentType = await prisma.appointmentType.findUnique({ where: { appId_key: { appId: app.id, key: OBO_APPOINTMENT_TYPE_KEY } }, select: { id: true, isActive: true, appId: true } })
  requireCondition(appointmentType?.isActive, `active appointment type '${OBO_APPOINTMENT_TYPE_KEY}' is missing.`)
  requireCondition(appointmentType.appId === app.id, `appointment type '${OBO_APPOINTMENT_TYPE_KEY}' belongs to a different application.`)

  const schedule = await prisma.availabilitySchedule.findFirst({
    where: {
      appointmentTypeId: appointmentType.id,
      dayOfWeek: 5,
      startTime: '09:00',
      endTime: '12:00',
      timezone: 'UTC',
      slotDurationMinutes: 30,
      capacity: 1,
      isActive: true,
    },
  })
  requireCondition(schedule, 'Friday 09:00-12:00 appointment availability is missing or incorrect.')

  const slot = await prisma.appointmentSlot.findUnique({
    where: { appointmentTypeId_startsAt: { appointmentTypeId: appointmentType.id, startsAt: OBO_SLOT_START } },
  })
  requireCondition(slot, `development appointment slot '${OBO_APPOINTMENT_REFERENCE}' is missing.`)
  requireCondition(slot.scheduleId === schedule.id, 'development appointment slot is not linked to the configured availability schedule.')
  requireCondition(slot.capacity === 1, 'development appointment slot capacity is incorrect.')

  const application = await prisma.oboPermitApplication.findUnique({
    where: { appId_referenceNumber: { appId: app.id, referenceNumber: 'OBO-DEV-20300610-0001' } },
    select: { formVersionId: true },
  })
  requireCondition(application?.formVersionId === formVersion.id, 'development OBO application is not bound to the published platform form version.')

  console.log(`OBO platform configuration verified: ${OBO_FORM_KEY} v${OBO_FORM_VERSION}, ${requirements.length} document requirements, and configured appointment availability.`)
}

export { DOCUMENT_TYPES, DOCUMENT_REQUIREMENTS, seedOboPlatformConfiguration, verifyOboPlatformConfiguration }

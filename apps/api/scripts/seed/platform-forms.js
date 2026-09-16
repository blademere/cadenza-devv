const PLAN_PERMIT_FORM = {
  key: 'obo-building-plan-permit',
  name: 'Building Plan Permit Application',
  description: 'Dynamic application form for OBO building plan permit applications.',
  entityType: 'OboPermitApplication',
  version: 1,
  sections: [
    { key: 'project', title: 'Project Information', sortOrder: 0 },
    { key: 'site', title: 'Project Site', sortOrder: 1 },
    { key: 'construction', title: 'Construction Details', sortOrder: 2 },
    { key: 'professionals', title: 'Professionals', sortOrder: 3 },
  ],
  fields: [
    { key: 'projectName', label: 'Project Name', type: 'text', required: true, sectionKey: 'project', sortOrder: 0 },
    { key: 'projectType', label: 'Project Type', type: 'select', required: true, sectionKey: 'project', sortOrder: 1, options: [
      { value: 'RESIDENTIAL', label: 'Residential' },
      { value: 'COMMERCIAL', label: 'Commercial' },
      { value: 'INSTITUTIONAL', label: 'Institutional' },
      { value: 'INDUSTRIAL', label: 'Industrial' },
    ] },
    { key: 'address', label: 'Project Address', type: 'textarea', required: true, sectionKey: 'site', sortOrder: 0 },
    { key: 'occupancyClassification', label: 'Occupancy Classification', type: 'select', required: true, sectionKey: 'site', sortOrder: 1, options: [
      { value: 'RESIDENTIAL', label: 'Residential' },
      { value: 'COMMERCIAL', label: 'Commercial' },
      { value: 'MIXED_USE', label: 'Mixed Use' },
    ] },
    { key: 'floorAreaSqm', label: 'Floor Area (sq m)', type: 'number', required: true, sectionKey: 'construction', sortOrder: 0, validation: [
      { operator: 'min', value: 1, message: 'Floor area must be greater than 0.' },
    ] },
    { key: 'storeys', label: 'Number of Storeys', type: 'integer', required: true, sectionKey: 'construction', sortOrder: 1, validation: [
      { operator: 'min', value: 1, message: 'Number of storeys must be at least 1.' },
    ] },
    { key: 'scopeOfWork', label: 'Scope of Work', type: 'textarea', required: true, sectionKey: 'construction', sortOrder: 2 },
    { key: 'estimatedCost', label: 'Estimated Construction Cost', type: 'number', required: true, sectionKey: 'construction', sortOrder: 3, validation: [
      { operator: 'min', value: 1, message: 'Estimated construction cost must be greater than 0.' },
    ] },
    {
      key: 'architect',
      label: 'Architect',
      type: 'reference',
      required: true,
      sectionKey: 'professionals',
      sortOrder: 0,
      config: {
        referenceType: 'obo_professional',
        professionalRole: 'ARCHITECT',
        multiple: false,
      },
    },
  ],
}

async function seedPlatformForms(prisma) {
  const app = await prisma.app.findUnique({ where: { key: 'obo' } })
  if (!app) throw new Error("Application 'obo' must be seeded before platform forms.")
  const form = await prisma.form.upsert({
    where: { key: PLAN_PERMIT_FORM.key },
    update: {
      appId: app.id,
      name: PLAN_PERMIT_FORM.name,
      description: PLAN_PERMIT_FORM.description,
      entityType: PLAN_PERMIT_FORM.entityType,
      isActive: true,
    },
    create: {
      appId: app.id,
      key: PLAN_PERMIT_FORM.key,
      name: PLAN_PERMIT_FORM.name,
      description: PLAN_PERMIT_FORM.description,
      entityType: PLAN_PERMIT_FORM.entityType,
      isActive: true,
    },
  })

  const version = await prisma.formVersion.upsert({
    where: { formId_version: { formId: form.id, version: PLAN_PERMIT_FORM.version } },
    update: { status: 'PUBLISHED' },
    create: { formId: form.id, version: PLAN_PERMIT_FORM.version, status: 'PUBLISHED' },
  })

  for (const section of PLAN_PERMIT_FORM.sections) {
    const sectionRecord = await prisma.formSection.upsert({
      where: { formVersionId_key: { formVersionId: version.id, key: section.key } },
      update: { title: section.title, sortOrder: section.sortOrder },
      create: { formVersionId: version.id, ...section },
    })
    void sectionRecord
  }

  const sections = await prisma.formSection.findMany({ where: { formVersionId: version.id } })
  const sectionByKey = new Map(sections.map((section) => [section.key, section]))

  for (const field of PLAN_PERMIT_FORM.fields) {
    const sectionId = field.sectionKey ? sectionByKey.get(field.sectionKey)?.id : null
    await prisma.formField.upsert({
      where: { formVersionId_key: { formVersionId: version.id, key: field.key } },
      update: {
        sectionId,
        label: field.label,
        type: field.type,
        required: field.required,
        sortOrder: field.sortOrder,
        validation: field.validation || undefined,
        config: field.config || undefined,
      },
      create: {
        formVersionId: version.id,
        sectionId,
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        sortOrder: field.sortOrder,
        validation: field.validation || undefined,
        config: field.config || undefined,
      },
    })

    const formField = await prisma.formField.findUnique({
      where: { formVersionId_key: { formVersionId: version.id, key: field.key } },
    })

    if (field.options?.length) {
      for (const [sortOrder, option] of field.options.entries()) {
        await prisma.formOption.upsert({
          where: { fieldId_value: { fieldId: formField.id, value: String(option.value) } },
          update: { label: option.label, sortOrder },
          create: { fieldId: formField.id, value: String(option.value), label: option.label, sortOrder },
        })
      }
    }
  }

  console.log(`Platform form ensured: ${PLAN_PERMIT_FORM.key} v${PLAN_PERMIT_FORM.version}`)
  return { form, version }
}

export { PLAN_PERMIT_FORM, seedPlatformForms }

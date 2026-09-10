const OBO_PERMIT_FORM_KEY = 'obo-building-plan-permit'
const OBO_FORM_VERSION = 1
const OBO_APPLICATION_REFERENCE = 'OBO-DEV-20300610-0001'

async function bindOboDevelopmentForm(prisma) {
  const form = await prisma.form.findUnique({
    where: { key: OBO_PERMIT_FORM_KEY },
  })
  if (!form || !form.isActive) throw new Error(`Active platform form '${OBO_PERMIT_FORM_KEY}' was not seeded.`)

  const formVersion = await prisma.formVersion.findUnique({
    where: {
      formId_version: {
        formId: form.id,
        version: OBO_FORM_VERSION,
      },
    },
  })
  if (!formVersion || formVersion.status !== 'PUBLISHED') {
    throw new Error(`Published platform form '${OBO_PERMIT_FORM_KEY}' v${OBO_FORM_VERSION} was not seeded.`)
  }

  const application = await prisma.oboPermitApplication.findUnique({
    where: { referenceNumber: OBO_APPLICATION_REFERENCE },
  })
  if (!application) throw new Error(`OBO development application '${OBO_APPLICATION_REFERENCE}' was not seeded.`)

  const updated = await prisma.oboPermitApplication.update({
    where: { id: application.id },
    data: { formVersionId: formVersion.id },
  })

  console.log(`OBO application bound to platform form: ${OBO_APPLICATION_REFERENCE} -> ${OBO_PERMIT_FORM_KEY} v${formVersion.version}`)
  return { form, formVersion, application: updated }
}

export { bindOboDevelopmentForm }

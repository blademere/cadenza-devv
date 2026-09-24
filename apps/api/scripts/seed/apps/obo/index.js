import { seedOboAuthorization } from './authorization.js'
import { seedOboWorkflow } from './workflow.js'
import { seedPlatformForms } from './forms.js'
import { seedOboReferenceData } from './reference.js'
import { seedOboDevelopmentScenario, verifyOboDevelopmentScenario } from './development.js'
import { seedOboPlatformConfiguration, verifyOboPlatformConfiguration } from './platform-configuration.js'
import { bindOboDevelopmentForm } from './form-bindings.js'
import { seedRolePersons } from './people.js'
import { seedOboProfessionalVerificationFixtures, verifyOboProfessionalVerificationFixtures } from './professional-verification.js'
import { seedOboNotifications } from './notifications.js'

async function requireOboApplication(prisma) {
  const application = await prisma.app.findUnique({ where: { key: 'obo' } })
  if (!application) throw new Error("Platform application 'obo' is missing. Run the platform seed first.")
  return application
}

async function seedObo(prisma, { profile = 'default' } = {}) {
  const obo = await requireOboApplication(prisma)
  const { roles, permissionRecords } = await seedOboAuthorization(prisma, obo)
  await seedOboWorkflow(prisma)

  if (profile === 'development') {
    const { form: applicationForm } = await seedPlatformForms(prisma)
    await seedOboReferenceData(prisma, { applicationForm })
    await seedOboDevelopmentScenario(prisma, { roles, passwordHash: null })
    await seedOboPlatformConfiguration(prisma)
    await bindOboDevelopmentForm(prisma)
    await seedRolePersons(prisma)
    await verifyOboPlatformConfiguration(prisma)
    await verifyOboDevelopmentScenario(prisma)
  }

  if (profile === 'fixtures') {
    await seedOboProfessionalVerificationFixtures(prisma, { roles, passwordHash: null })
    await seedOboNotifications(prisma)
    await verifyOboProfessionalVerificationFixtures(prisma)
  }

  return { application: obo, roles, permissionRecords }
}

export { seedObo }

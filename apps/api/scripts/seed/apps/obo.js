import { seedApplication } from '../applications.js'
import { seedAuthorization } from '../authorization.js'
import { seedPlatformForms } from '../platform-forms.js'
import { seedOboReferenceData } from '../obo-reference.js'
import { seedOboDevelopmentScenario, verifyOboDevelopmentScenario } from '../obo-development.js'
import { seedOboPlatformConfiguration, verifyOboPlatformConfiguration } from '../obo-platform-configuration.js'
import { bindOboDevelopmentForm } from '../obo-form-bindings.js'
import { seedRolePersons } from '../people.js'
import { seedOboProfessionalVerificationFixtures, verifyOboProfessionalVerificationFixtures } from '../obo-professional-verification.js'
import { seedOboNotifications } from '../notifications.js'

async function seedObo(prisma, { profile = 'default' } = {}) {
  const obo = await seedApplication(prisma, 'obo')
  const { roles, permissionRecords } = await seedAuthorization(prisma, {
    applications: { obo },
    applicationKeys: ['obo'],
  })
  const { form: applicationForm } = await seedPlatformForms(prisma)
  await seedOboReferenceData(prisma, { applicationForm })

  if (profile === 'development') {
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

const OBO_PROFESSIONAL_VERIFICATION_FIXTURES = [
  {
    email: 'obo-professional-verify-approve@example.test',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+630000000101',
    registrationNumber: 'DEV-OBO-VERIFY-ACCEPT-0001',
    prcId: 'DEV-PRC-VERIFY-ACCEPT-0001',
    ptrNumber: 'DEV-PTR-VERIFY-ACCEPT-0001',
    professionalRole: 'ARCHITECT',
  },
  {
    email: 'obo-professional-verify-decline@example.test',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+630000000102',
    registrationNumber: 'DEV-OBO-VERIFY-DECLINE-0001',
    prcId: 'DEV-PRC-VERIFY-DECLINE-0001',
    ptrNumber: 'DEV-PTR-VERIFY-DECLINE-0001',
    professionalRole: 'CIVIL_ENGINEER',
  },
]

const ensureUser = async (prisma, { email, roleId, passwordHash }) => {
  const user = await prisma.user.upsert({
    where: { email },
    update: { isActive: true, ...(passwordHash ? { passwordHash } : {}) },
    create: { email, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
  })
  const app = await prisma.app.findUnique({ where: { key: 'obo' } })
  if (!app) throw new Error("Application 'obo' must be seeded before OBO professional verification fixtures.")
  const membership = await prisma.appMembership.upsert({
    where: { appId_userId: { appId: app.id, userId: user.id } },
    update: { isActive: true },
    create: { appId: app.id, userId: user.id },
  })
  await prisma.appMembershipRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId } },
    update: {},
    create: { membershipId: membership.id, roleId },
  })
  return user
}

const ensurePendingProfessional = async (prisma, fixture, { roleId, passwordHash }) => {
  const user = await ensureUser(prisma, { email: fixture.email, roleId, passwordHash })
  const person = await prisma.person.upsert({
    where: { userId: user.id },
    update: { firstName: fixture.firstName, lastName: fixture.lastName, email: fixture.email, phone: fixture.phone, isActive: true },
    create: { userId: user.id, firstName: fixture.firstName, lastName: fixture.lastName, email: fixture.email, phone: fixture.phone, isActive: true },
  })
  const professional = await prisma.oboProfessional.upsert({
    where: { registrationNumber: fixture.registrationNumber },
    update: { personId: person.id, userId: user.id, prcId: fixture.prcId, ptrNumber: fixture.ptrNumber, professionalRole: fixture.professionalRole, status: 'PENDING_VERIFICATION', verifiedByUserId: null, verifiedAt: null, verificationReason: null },
    create: { personId: person.id, userId: user.id, registrationNumber: fixture.registrationNumber, prcId: fixture.prcId, ptrNumber: fixture.ptrNumber, professionalRole: fixture.professionalRole, status: 'PENDING_VERIFICATION' },
  })
  await prisma.oboProfessionalVerificationDecision.deleteMany({ where: { professionalId: professional.id } })
  return { user, person, professional }
}

async function seedOboProfessionalVerificationFixtures(prisma, { roles, passwordHash = null }) {
  const fixtures = []
  for (const fixture of OBO_PROFESSIONAL_VERIFICATION_FIXTURES) {
    fixtures.push(await ensurePendingProfessional(prisma, fixture, { roleId: roles.professional.id, passwordHash }))
  }
  console.log('OBO professional verification fixtures reset: approve and decline cases are PENDING_VERIFICATION.')
  return fixtures
}

async function verifyOboProfessionalVerificationFixtures(prisma) {
  for (const fixture of OBO_PROFESSIONAL_VERIFICATION_FIXTURES) {
    const professional = await prisma.oboProfessional.findUnique({
      where: { registrationNumber: fixture.registrationNumber },
      select: { id: true, status: true, userId: true, prcId: true, ptrNumber: true, professionalRole: true, verifiedByUserId: true, verifiedAt: true, verificationReason: true, person: { select: { firstName: true, lastName: true, email: true } } },
    })
    if (!professional) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' was not seeded.`)
    if (professional.status !== 'PENDING_VERIFICATION') throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' must be PENDING_VERIFICATION.`)
    if (!professional.userId) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' must have a linked user.`)
    if (professional.prcId !== fixture.prcId || professional.ptrNumber !== fixture.ptrNumber) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' has inconsistent credentials.`)
    if (professional.professionalRole !== fixture.professionalRole) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' must have role '${fixture.professionalRole}'.`)
    if (professional.verifiedByUserId !== null || professional.verifiedAt !== null || professional.verificationReason !== null) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' must not contain a prior verification decision.`)
    if (professional.person.firstName !== fixture.firstName || professional.person.lastName !== fixture.lastName || professional.person.email !== fixture.email) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' has inconsistent person data.`)
    const decisions = await prisma.oboProfessionalVerificationDecision.count({ where: { professionalId: professional.id } })
    if (decisions !== 0) throw new Error(`OBO professional verification fixture '${fixture.registrationNumber}' must not contain prior decisions.`)
  }
  console.log(`OBO professional verification fixtures verified: ${OBO_PROFESSIONAL_VERIFICATION_FIXTURES.length} pending cases.`)
  return true
}

export { OBO_PROFESSIONAL_VERIFICATION_FIXTURES, seedOboProfessionalVerificationFixtures, verifyOboProfessionalVerificationFixtures }

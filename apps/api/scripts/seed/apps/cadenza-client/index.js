import bcrypt from 'bcrypt';

const APP_KEY = 'cadenza-client';

const users = [
  {
    type: 'CLIENT',
    email: 'client@example.com',
    firstName: 'Cadenza',
    lastName: 'Client',
    phone: '+630000000001',
  },
  {
    type: 'STAFF',
    staffType: 'FRONT_DESK',
    email: 'frontdesk@example.com',
    firstName: 'Cadenza',
    lastName: 'Front Desk',
    phone: '+630000000002',
  },
  {
    type: 'STAFF',
    staffType: 'ADMIN',
    email: 'admin@example.com',
    firstName: 'System',
    lastName: 'Administrator',
    phone: '+630000000004',
  },
];

const DEVELOPMENT_PASSWORD =
  process.env.SEED_CADENZA_PASSWORD || '112233445566';

async function seedCadenzaClientDevelopmentUsers(prisma, application) {
  const passwordHash = await bcrypt.hash(DEVELOPMENT_PASSWORD, 12);

  for (const definition of users) {
    const user = await prisma.user.upsert({
      where: {
        email: definition.email,
      },
      update: {
        isActive: true,
        passwordHash,
      },
      create: {
        email: definition.email,
        isActive: true,
        passwordHash,
      },
    });

    const person = await prisma.person.upsert({
      where: {
        userId: user.id,
      },
      update: {
        firstName: definition.firstName,
        lastName: definition.lastName,
        email: definition.email,
        phone: definition.phone,
      },
      create: {
        userId: user.id,
        firstName: definition.firstName,
        lastName: definition.lastName,
        email: definition.email,
        phone: definition.phone,
      },
    });

    if (definition.type === 'CLIENT') {
      await prisma.cadenzaCustomer.upsert({
        where: {
          appId_personId: {
            appId: application.id,
            personId: person.id,
          },
        },
        update: {
          status: 'ACTIVE',
        },
        create: {
          appId: application.id,
          personId: person.id,
          status: 'ACTIVE',
        },
      });
    }

    if (definition.type === 'STAFF') {
      await prisma.cadenzaStaff.upsert({
        where: {
          appId_personId: {
            appId: application.id,
            personId: person.id,
          },
        },
        update: {
          staffType: definition.staffType,
          status: 'ACTIVE',
        },
        create: {
          appId: application.id,
          personId: person.id,
          staffType: definition.staffType,
          status: 'ACTIVE',
        },
      });
    }
  }
}

async function seedCadenzaClient(prisma, { profile = 'default' } = {}) {
  const application = await prisma.app.findUnique({
    where: {
      key: APP_KEY,
    },
  });

  if (!application) {
    throw new Error(
      "Platform application 'cadenza-client' is missing. Run the platform seed first.",
    );
  }

  if (profile === 'development') {
    await seedCadenzaClientDevelopmentUsers(prisma, application);
  }

  return {
    application,
  };
}

export { seedCadenzaClient };

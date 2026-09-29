import bcrypt from 'bcrypt';
import { seedAuthorizationCatalog } from '../../authorization-core.js';

const APP_KEY = 'cadenza-client';

const catalog = {
  cadenza_client: ['read', 'create', 'update'],
  cadenza_rooms: ['read', 'create', 'update'],
  cadenza_staff: ['read', 'create', 'update'],
  cadenza_instruments: ['read', 'create', 'update'],
  cadenza_room_rentals: ['read', 'create', 'update'],
  cadenza_lesson_packages: ['read', 'create', 'update'],
};

const roles = {
  cadenza_client_user: {
    permissions: ['cadenza_client:read', 'cadenza_rooms:read'],
    description: 'Cadenza Client user.',
  },

  cadenza_client_front_desk: {
    permissions: [
      'cadenza_client:read',
      'cadenza_rooms:read',
      'cadenza_rooms:create',
      'cadenza_rooms:update',
      'cadenza_staff:read',
      'cadenza_staff:create',
      'cadenza_staff:update',
      'cadenza_instruments:read',
      'cadenza_instruments:create',
      'cadenza_instruments:update',
      'cadenza_room_rentals:read',
      'cadenza_room_rentals:create',
      'cadenza_room_rentals:update',
      'cadenza_lesson_packages:read',
    ],
    description: 'Cadenza Client front-desk user.',
  },

  cadenza_client_admin: {
    permissions: [
      'cadenza_client:read',
      'cadenza_client:create',
      'cadenza_client:update',

      'cadenza_rooms:read',
      'cadenza_rooms:create',
      'cadenza_rooms:update',


      'cadenza_staff:read',
      'cadenza_staff:create',
      'cadenza_staff:update',

      'cadenza_instruments:read',
      'cadenza_instruments:create',
      'cadenza_instruments:update',

      'cadenza_room_rentals:read',
      'cadenza_room_rentals:create',
      'cadenza_room_rentals:update',

      'cadenza_lesson_packages:read',
      'cadenza_lesson_packages:create',
      'cadenza_lesson_packages:update',
      
    ],
    description: 'Cadenza Client administrator.',
  },
};

const users = [
  {
    role: 'cadenza_client_user',
    email: 'client@example.com',
    firstName: 'Cadenza',
    lastName: 'Client',
    phone: '+630000000001',
  },
  {
    role: 'cadenza_client_front_desk',
    email: 'frontdesk@example.com',
    firstName: 'Cadenza',
    lastName: 'Front Desk',
    phone: '+630000000002',
  },
  {
    role: 'cadenza_admin',
    email: 'admin@example.com',
    firstName: 'System',
    lastName: 'Administrator',
    phone: '+630000000004',
  },
];

const DEVELOPMENT_PASSWORD =
  process.env.SEED_CADENZA_PASSWORD || '112233445566';

async function ensureMembership(prisma, { userId, appId, roleId }) {
  const membership = await prisma.appMembership.upsert({
    where: {
      appId_userId: {
        appId,
        userId,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      appId,
      userId,
    },
  });

  await prisma.appMembershipRole.upsert({
    where: {
      membershipId_roleId: {
        membershipId: membership.id,
        roleId,
      },
    },
    update: {},
    create: {
      membershipId: membership.id,
      roleId,
    },
  });
}

async function seedCadenzaClientDevelopmentUsers(
  prisma,
  application,
  seededRoles,
) {
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

    const roleKey =
      definition.role === 'cadenza_admin'
        ? 'cadenza_client_admin'
        : definition.role;
    const roleId = seededRoles[roleKey]?.id;
    if (!roleId) {
      throw new Error(`Cadenza Client role '${definition.role}' was not seeded.`);
    }

    await ensureMembership(prisma, {
      userId: user.id,
      appId: application.id,
      roleId,
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

    if (definition.role === 'cadenza_client_user') {
      await prisma.cadenzaCustomer.upsert({
        where: {
          appId_personId: {
            appId: application.id,
            personId: person.id,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          appId: application.id,
          personId: person.id,
          status: 'ACTIVE',
        },
      });
    }

    if (definition.role === 'cadenza_client_front_desk') {
      await prisma.cadenzaStaff.upsert({
        where: {
          appId_personId: {
            appId: application.id,
            personId: person.id,
          },
        },
        update: { staffType: 'FRONT_DESK', status: 'ACTIVE' },
        create: {
          appId: application.id,
          personId: person.id,
          staffType: 'FRONT_DESK',
          status: 'ACTIVE',
        },
      });
    }

    if (roleKey === 'cadenza_client_admin') {
      await prisma.cadenzaStaff.upsert({
        where: {
          appId_personId: {
            appId: application.id,
            personId: person.id,
          },
        },
        update: { staffType: 'ADMIN', status: 'ACTIVE' },
        create: {
          appId: application.id,
          personId: person.id,
          staffType: 'ADMIN',
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

  const authorization = await seedAuthorizationCatalog(prisma, {
  catalog,
  application,
  roles,
  cleanupPrefixes: [
    'cadenza_client',
    'cadenza_rooms',
    'cadenza_staff',
    'cadenza_instruments',
    'cadenza_room_rentals',
    'cadenza_lesson_packages',
  ],
});

  if (profile === 'development') {
    await seedCadenzaClientDevelopmentUsers(
      prisma,
      application,
      authorization.roles,
    );
  }

  return {
    application,
    ...authorization,
  };
}

export { seedCadenzaClient };

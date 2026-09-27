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
    role: 'cadenza_admin',
    email: 'admin@example.com',
    firstName: 'System',
    lastName: 'Administrator',
    phone: '+630000000004',
  },
];

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
  const passwordHash = await bcrypt.hash('112233445566', 12);

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

    const roleId =
      definition.role === 'cadenza_admin'
        ? seededRoles.cadenza_client_admin.id
        : seededRoles.cadenza_client_user.id;

    await ensureMembership(prisma, {
      userId: user.id,
      appId: application.id,
      roleId,
    });

    await prisma.person.upsert({
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

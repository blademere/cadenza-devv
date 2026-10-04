import { seedPlatform } from './platform.js';
import { seedCadenzaClient } from './apps/cadenza-client/index.js';

const PROFILES = new Set([
  'default',
  'development',
  'fixtures',
]);

const APPS = new Set([
  'platform',
  'cadenza-client',
  'all',
]);

async function runSeed(
  prisma,
  profile = 'default',
  app = 'platform',
) {
  if (!PROFILES.has(profile)) {
    throw new Error(
      `Unknown seed profile '${profile}'. Expected one of: ${[
        ...PROFILES,
      ].join(', ')}.`,
    );
  }

  if (!APPS.has(app)) {
    throw new Error(
      `Unknown seed app '${app}'. Expected one of: ${[
        ...APPS,
      ].join(', ')}.`,
    );
  }

  const context = {
    applications: {},
    roles: {},
    permissionRecords: new Map(),
  };

  if (app === 'platform' || app === 'all') {
    const platform = await seedPlatform(prisma);

    Object.assign(
      context.applications,
      platform.applications,
    );

    for (const [key, permission] of platform.permissionRecords) {
      context.permissionRecords.set(key, permission);
    }
  }

  if (app === 'cadenza-client') {
    const platform = await seedPlatform(prisma, {
      applications: ['cadenza-client'],
    });

    Object.assign(
      context.applications,
      platform.applications,
    );

    for (const [key, permission] of platform.permissionRecords) {
      context.permissionRecords.set(key, permission);
    }
  }

  if (
    app === 'cadenza-client' ||
    app === 'all'
  ) {
    if (!context.applications['cadenza-client']) {
      const platform = await seedPlatform(prisma, {
        applications: ['cadenza-client'],
      });

      Object.assign(
        context.applications,
        platform.applications,
      );

      for (const [key, permission] of platform.permissionRecords) {
        context.permissionRecords.set(key, permission);
      }
    }

    const cadenzaClient =
      await seedCadenzaClient(prisma, {
        profile,
      });

    context.applications['cadenza-client'] =
      cadenzaClient.application;
  }

  console.log(
    `Seed complete (${profile}, ${app}): ${context.permissionRecords.size} permissions, ${Object.keys(context.applications).length} application(s).`,
  );

  return context;
}

export {
  PROFILES,
  APPS,
  runSeed,
};
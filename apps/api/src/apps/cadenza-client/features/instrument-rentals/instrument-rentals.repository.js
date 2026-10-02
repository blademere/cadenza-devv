import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const instrumentRentalsRepository = {
  findAll(appId) {
    return prisma.cadenzaRental.findMany({
      where: {
        appId,
      },
      include: {
        rentalPackage: {
          include: {
            items: true,
          },
        },
        items: {
          include: {
            instrument: true,
          },
        },
        customer: {
          include: {
            person: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  findInstrumentById(appId, id) {
    return prisma.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
      },
    });
  },

  findAvailableInstruments(appId) {
    return prisma.cadenzaInstrument.findMany({
      where: {
        appId,
        status: 'AVAILABLE',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },

  findOverlappingInstrumentIds(
    appId,
    instrumentIds,
    scheduledStart,
    scheduledEnd,
  ) {
    if (!instrumentIds.length) {
      return Promise.resolve([]);
    }

    return prisma.cadenzaRentalItem
      .findMany({
        where: {
          appId,
          instrumentId: {
            in: instrumentIds,
          },
          rental: {
            status: {
              notIn: ['CANCELLED', 'REJECTED'],
            },
            scheduledStart: {
              lt: scheduledEnd,
            },
            scheduledEnd: {
              gt: scheduledStart,
            },
          },
        },
        select: {
          instrumentId: true,
        },
      })
      .then((items) =>
        items.map((item) => item.instrumentId),
      );
  },

  findCustomerById(appId, customerId) {
    return prisma.cadenzaCustomer.findFirst({
      where: {
        id: customerId,
        appId,
      },
    });
  },

  findActiveRentalPackages(appId) {
    return prisma.cadenzaRentalPackage.findMany({
      where: {
        appId,
        status: 'ACTIVE',
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },

  findRentalPackageById(appId, id) {
    return prisma.cadenzaRentalPackage.findFirst({
      where: {
        id,
        appId,
      },
      include: {
        items: true,
      },
    });
  },

  createRental(data) {
    return prisma.cadenzaRental.create({
      data,
    });
  },

  createRentalItems(data) {
    return prisma.cadenzaRentalItem.createMany({
      data,
    });
  },

  findRentalsByCustomer(appId, customerId) {
    return prisma.cadenzaRental.findMany({
      where: {
        appId,
        customerId,
      },
      include: {
        rentalPackage: {
          include: {
            items: true,
          },
        },
        items: {
          include: {
            instrument: true,
          },
        },
      },
      orderBy: {
        scheduledStart: 'desc',
      },
    });
  },

  findRentalById(appId, id, customerId = undefined) {
    return prisma.cadenzaRental.findFirst({
      where: {
        id,
        appId,
        ...(customerId ? { customerId } : {}),
      },
      include: {
        rentalPackage: {
          include: {
            items: true,
          },
        },
        items: {
          include: {
            instrument: true,
          },
        },
      },
    });
  },

  cancelRental(appId, customerId, id, data) {
    return prisma.cadenzaRental.updateMany({
      where: {
        id,
        appId,
        customerId,
        status: {
          notIn: ['CANCELLED', 'COMPLETED'],
        },
      },
      data,
    });
  },
};

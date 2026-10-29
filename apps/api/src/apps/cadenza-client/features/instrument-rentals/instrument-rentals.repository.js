import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const hydrateRentalInstruments = async (rental, db = prisma) => {
  if (!rental?.items?.length) return rental;

  const resourceIds = rental.items
    .map((item) => item.instrument?.resourceId)
    .filter(Boolean);
  const resources = await db.resource.findMany({
    where: { id: { in: resourceIds }, appId: rental.appId },
    select: { id: true, name: true },
  });
  const names = new Map(resources.map((resource) => [resource.id, resource.name]));

  return {
    ...rental,
    items: rental.items.map((item) => ({
      ...item,
      instrument: item.instrument
        ? { ...item.instrument, name: names.get(item.instrument.resourceId) || item.instrument.name }
        : item.instrument,
    })),
  };
};

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
            instrument: {
              include: {
                instrumentType: true,
              },
            },
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

  async updateStaffDecision(appId, id, data) {
    const result = await prisma.cadenzaRental.updateMany({
      where: {
        id,
        appId,
        status: {
          in: [
            'FOR_APPROVAL',
            'PENDING',
            'PENDING_PAYMENT',
            'PENDING_CONFIRMATION',
            'PARTIALLY_PAID',
          ],
        },
      },
      data,
    });

    if (!result.count) return null;

    const rentals = await this.findAll(appId);
    return rentals.find((rental) => rental.id === id) || null;
  },

  async returnRental(appId, id, data) {
    const result = await prisma.cadenzaRental.updateMany({
      where: {
        id,
        appId,
        status: 'APPROVED',
      },
      data,
    });

    if (!result.count) return null;

    const rentals = await this.findAll(appId);
    return rentals.find((rental) => rental.id === id) || null;
  },

  async receiveRental(appId, id, data) {
    const result = await prisma.cadenzaRental.updateMany({
      where: { id, appId, status: 'APPROVED' },
      data,
    });
    if (!result.count) return null;
    const rentals = await this.findAll(appId);
    return rentals.find((rental) => rental.id === id) || null;
  },

  findInstrumentById(appId, id) {
    return prisma.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
        status: 'AVAILABLE',
        rentalItems: {
          none: {
            rental: {
              status: {
                in: [
                  'FOR_APPROVAL',
                  'PENDING',
                  'PENDING_PAYMENT',
                  'PENDING_CONFIRMATION',
                  'PARTIALLY_PAID',
                  'APPROVED',
                ],
              },
              returnedAt: null,
            },
          },
        },
      },
    });
  },

  findAvailableInstruments(appId) {
    return prisma.cadenzaInstrument.findMany({
      where: {
        appId,
        status: 'AVAILABLE',
        rentalItems: {
          none: {
            rental: {
              status: {
                in: [
                  'FOR_APPROVAL',
                  'PENDING',
                  'PENDING_PAYMENT',
                  'PENDING_CONFIRMATION',
                  'PARTIALLY_PAID',
                  'APPROVED',
                ],
              },
              returnedAt: null,
            },
          },
        },
      },
      include: {
        instrumentType: true,
        itemCategory: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },

  findReservedIntervals(appId, instrumentId) {
    return prisma.cadenzaRentalItem.findMany({
      where: {
        appId, instrumentId,
        rental: { status: { in: ['FOR_APPROVAL', 'PENDING', 'PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PARTIALLY_PAID', 'APPROVED'] },
          scheduledEnd: { gt: new Date() },
        },
      },
      select: { rental: { select: { scheduledStart: true, scheduledEnd: true } } },
    }).then((rows) => rows.map(({ rental }) => ({
      scheduledStart: rental.scheduledStart,
      scheduledEnd: rental.scheduledEnd,
    })));
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
              in: [
                'FOR_APPROVAL',
                'PENDING',
                'PENDING_PAYMENT',
                'PENDING_CONFIRMATION',
                'PARTIALLY_PAID',
                'APPROVED',
              ],
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

  async findRentalsByCustomer(appId, customerId) {
    const rentals = await prisma.cadenzaRental.findMany({
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
    return Promise.all(rentals.map((rental) => hydrateRentalInstruments(rental)));
  },

  async findRentalById(appId, id, customerId = undefined) {
    const rental = await prisma.cadenzaRental.findFirst({
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
    return hydrateRentalInstruments(rental);
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

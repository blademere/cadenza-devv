const mockInstruments = [
  {
    id: "INST-001",
    name: "Acoustic Guitar",
    category: "Guitar",
    brand: "Yamaha",
    model: "F310",
    condition: "Good",
    dailyRate: 350,
    weeklyRate: 1800,
    description:
      "A beginner-friendly acoustic guitar suitable for practice and performances.",
  },
  {
    id: "INST-002",
    name: "Electric Guitar",
    category: "Guitar",
    brand: "Fender",
    model: "Squier Stratocaster",
    condition: "Good",
    dailyRate: 500,
    weeklyRate: 2800,
    description:
      "Electric guitar suitable for rehearsals, performances, and practice.",
  },
  {
    id: "INST-003",
    name: "Keyboard",
    category: "Keyboard",
    brand: "Yamaha",
    model: "PSR-E373",
    condition: "Excellent",
    dailyRate: 600,
    weeklyRate: 3500,
    description:
      "Portable keyboard suitable for practice, lessons, and small performances.",
  },
  {
    id: "INST-004",
    name: "Violin",
    category: "String",
    brand: "Cremona",
    model: "SV-175",
    condition: "Excellent",
    dailyRate: 400,
    weeklyRate: 2200,
    description:
      "A quality violin suitable for beginners and intermediate players.",
  },
];

const mockMyRentals = [
  {
    id: "RENT-0001",
    instrumentId: "INST-001",
    instrumentName: "Acoustic Guitar",
    brand: "Yamaha",
    model: "F310",
    startDate: "September 12, 2026",
    endDate: "September 14, 2026",
    quantity: 1,
    totalAmount: 1050,
    status: "APPROVED",
    rentedAt: "September 9, 2026",
  },
];

/*
|--------------------------------------------------------------------------
| Instruments
|--------------------------------------------------------------------------
*/

export async function getAvailableInstruments() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockInstruments);
    }, 500);
  });
}

export async function getInstrumentById(instrumentId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const instrument = mockInstruments.find(
        (item) => item.id === instrumentId,
      );

      if (!instrument) {
        reject(new Error("Instrument not found."));
        return;
      }

      resolve(instrument);
    }, 300);
  });
}

/*
|--------------------------------------------------------------------------
| Client Rentals
|--------------------------------------------------------------------------
*/

export async function getMyInstrumentRentals() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockMyRentals);
    }, 500);
  });
}

export async function getInstrumentRentalById(rentalId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const rental = mockMyRentals.find((item) => item.id === rentalId);

      if (!rental) {
        reject(new Error("Rental not found."));
        return;
      }

      resolve(rental);
    }, 300);
  });
}

export async function createInstrumentRental(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(`${payload.startDate}T00:00:00`);

      const end = new Date(`${payload.endDate}T00:00:00`);

      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const totalAmount = days * payload.dailyRate * payload.quantity;

      resolve({
        id: `RENT-${Date.now()}`,
        instrumentId: payload.instrumentId,
        instrumentName: payload.instrumentName,
        brand: payload.brand,
        model: payload.model,
        startDate: payload.startDate,
        endDate: payload.endDate,
        quantity: payload.quantity,
        totalAmount,
        status: "PENDING",
        rentedAt: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      });
    }, 700);
  });
}

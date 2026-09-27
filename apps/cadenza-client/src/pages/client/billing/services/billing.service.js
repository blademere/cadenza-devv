const mockTransactions = [
  {
    id: "TXN-0001",
    referenceNumber: "CDZ-2026-0001",

    type: "ENROLLMENT",
    description: "Piano Program Enrollment",

    serviceId: "ENR-0001",
    serviceName: "Piano",
    serviceDescription: "Beginner to advanced piano lessons.",

    amount: 2500,
    currency: "PHP",

    paymentMethod: "GCash",
    paymentStatus: "PAID",

    transactionDate: "September 5, 2026",
    paidAt: "September 5, 2026, 10:32 AM",

    notes: "Monthly enrollment fee.",
  },

  {
    id: "TXN-0002",
    referenceNumber: "CDZ-2026-0002",

    type: "ROOM_BOOKING",
    description: "Band Room Booking",

    serviceId: "BOOK-0001",
    serviceName: "Band Room A",
    serviceDescription: "Band rehearsal room.",

    amount: 1200,
    currency: "PHP",

    paymentMethod: "Cash",
    paymentStatus: "PAID",

    transactionDate: "September 7, 2026",
    paidAt: "September 7, 2026, 2:15 PM",

    notes: "Room booking payment.",
  },

  {
    id: "TXN-0003",
    referenceNumber: "CDZ-2026-0003",

    type: "INSTRUMENT_RENTAL",
    description: "Acoustic Guitar Rental",

    serviceId: "RENT-0001",
    serviceName: "Acoustic Guitar",
    serviceDescription: "Yamaha F310",

    amount: 1050,
    currency: "PHP",

    paymentMethod: "GCash",
    paymentStatus: "PAID",

    transactionDate: "September 9, 2026",
    paidAt: "September 9, 2026, 9:20 AM",

    notes: "3-day instrument rental.",
  },
];

export async function getMyTransactions() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockTransactions);
    }, 500);
  });
}

export async function getTransactionById(transactionId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const transaction = mockTransactions.find(
        (item) => item.id === transactionId,
      );

      if (!transaction) {
        reject(new Error("Transaction not found."));
        return;
      }

      resolve(transaction);
    }, 300);
  });
}

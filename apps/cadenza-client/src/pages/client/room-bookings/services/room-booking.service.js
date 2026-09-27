const mockRooms = [
  {
    id: "ROOM-001",
    name: "Band Room A",
    type: "Band Room",
    capacity: 6,
    hourlyRate: 500,
    description:
      "Fully equipped band room suitable for rehearsals and group practice.",
    equipment: [
      "Drum Set",
      "Guitar Amplifier",
      "Bass Amplifier",
      "Microphones",
      "PA System",
    ],
  },
  {
    id: "ROOM-002",
    name: "Band Room B",
    type: "Band Room",
    capacity: 8,
    hourlyRate: 600,
    description:
      "Spacious band room designed for larger groups and rehearsals.",
    equipment: [
      "Drum Set",
      "Guitar Amplifier",
      "Bass Amplifier",
      "Keyboard",
      "Microphones",
      "PA System",
    ],
  },
];

const mockMyBookings = [
  {
    id: "BOOK-0001",
    roomId: "ROOM-001",
    roomName: "Band Room A",
    date: "September 15, 2026",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    duration: 2,
    totalAmount: 1000,
    status: "APPROVED",
    bookedAt: "September 9, 2026",
  },
];

export async function getAvailableRooms() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockRooms);
    }, 500);
  });
}

export async function getRoomById(roomId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const room = mockRooms.find((item) => item.id === roomId);

      if (!room) {
        reject(new Error("Room not found."));
        return;
      }

      resolve(room);
    }, 300);
  });
}

export async function getMyRoomBookings() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockMyBookings);
    }, 500);
  });
}

export async function getRoomBookingById(bookingId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const booking = mockMyBookings.find((item) => item.id === bookingId);

      if (!booking) {
        reject(new Error("Booking not found."));
        return;
      }

      resolve(booking);
    }, 300);
  });
}

export async function createRoomBooking(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = new Date(`2026-01-01T${payload.startTime}`);

      const end = new Date(`2026-01-01T${payload.endTime}`);

      const duration = (end - start) / (1000 * 60 * 60);

      resolve({
        id: `BOOK-${Date.now()}`,
        roomId: payload.roomId,
        roomName: payload.roomName,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        duration,
        totalAmount: duration * payload.hourlyRate,
        status: "PENDING",
        bookedAt: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      });
    }, 700);
  });
}

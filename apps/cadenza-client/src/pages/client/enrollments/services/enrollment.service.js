const mockPackages = [
  {
    id: "PKG-001",
    name: "Piano",
    instrument: "Piano",
    description:
      "Learn piano fundamentals, techniques, music theory, and performance.",
    price: 2500,
    duration: "1 month",
  },
  {
    id: "PKG-002",
    name: "Guitar",
    instrument: "Guitar",
    description:
      "Learn guitar chords, techniques, rhythm, and song performance.",
    price: 2000,
    duration: "1 month",
  },
  {
    id: "PKG-003",
    name: "Violin",
    instrument: "Violin",
    description:
      "Develop violin techniques, music reading, and performance skills.",
    price: 2500,
    duration: "1 month",
  },
  {
    id: "PKG-004",
    name: "Drums",
    instrument: "Drums",
    description:
      "Build rhythm, coordination, drumming techniques, and performance skills.",
    price: 2200,
    duration: "1 month",
  },
];

const mockInstructors = [
  {
    id: "INS-001",
    name: "Maria Santos",
    instrument: "Piano",
    specialization: "Piano",
    experience: "8 years",
    rating: 4.9,
    level: "Beginner • Intermediate",
  },
  {
    id: "INS-002",
    name: "John Reyes",
    instrument: "Piano",
    specialization: "Piano",
    experience: "6 years",
    rating: 4.8,
    level: "Beginner • Advanced",
  },
  {
    id: "INS-003",
    name: "Ana Cruz",
    instrument: "Guitar",
    specialization: "Guitar",
    experience: "7 years",
    rating: 4.9,
    level: "Beginner • Intermediate",
  },
  {
    id: "INS-004",
    name: "Mark Dela Cruz",
    instrument: "Guitar",
    specialization: "Guitar",
    experience: "5 years",
    rating: 4.7,
    level: "Beginner • Advanced",
  },
  {
    id: "INS-005",
    name: "Sofia Garcia",
    instrument: "Violin",
    specialization: "Violin",
    experience: "9 years",
    rating: 4.9,
    level: "Beginner • Advanced",
  },
  {
    id: "INS-006",
    name: "Daniel Ramos",
    instrument: "Drums",
    specialization: "Drums",
    experience: "6 years",
    rating: 4.8,
    level: "Beginner • Intermediate",
  },
];

const mockMyEnrollment = {
  id: "ENR-0001",
  packageId: "PKG-001",
  packageName: "Piano",
  instrument: "Piano",
  instructorId: "INS-001",
  instructorName: "Maria Santos",
  status: "APPROVED",
  startDate: "September 15, 2026",
  enrolledAt: "September 5, 2026",
};

/*
|--------------------------------------------------------------------------
| Packages
|--------------------------------------------------------------------------
*/

export async function getAvailablePackages() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockPackages);
    }, 500);
  });
}

export async function getPackageById(packageId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const packageData = mockPackages.find((item) => item.id === packageId);

      if (!packageData) {
        reject(new Error("Package not found."));
        return;
      }

      resolve(packageData);
    }, 300);
  });
}

/*
|--------------------------------------------------------------------------
| Instructors
|--------------------------------------------------------------------------
*/

export async function getInstructorsByInstrument(instrument) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const instructors = mockInstructors.filter(
        (instructor) =>
          instructor.instrument.toLowerCase() === instrument.toLowerCase(),
      );

      resolve(instructors);
    }, 400);
  });
}

/*
|--------------------------------------------------------------------------
| Client Enrollment
|--------------------------------------------------------------------------
*/

export async function getMyEnrollment() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockMyEnrollment);
    }, 400);
  });
}

export async function getEnrollmentById(enrollmentId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (enrollmentId !== mockMyEnrollment.id) {
        reject(new Error("Enrollment not found."));
        return;
      }

      resolve(mockMyEnrollment);
    }, 300);
  });
}

export async function createEnrollment(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `ENR-${Date.now()}`,
        packageId: payload.packageId,
        packageName: payload.packageName,
        instrument: payload.instrument,
        instructorId: payload.instructorId,
        instructorName: payload.instructorName,
        startDate: payload.startDate,
        notes: payload.notes,
        status: "PENDING",
        enrolledAt: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      });
    }, 700);
  });
}

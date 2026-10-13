const studentSchedule = [
  {
    id: "mock-class-1",
    scheduledStart: "2026-10-12T08:00:00.000Z",
    scheduledEnd: "2026-10-12T09:00:00.000Z",
    lesson: "Piano Lesson",
    instructor: { id: "mock-instructor-1", name: "Terter" },
    room: { id: "mock-room-1", name: "Music Room 1" },
    status: "SCHEDULED",
  },
  {
    id: "mock-class-2",
    scheduledStart: "2026-10-14T08:00:00.000Z",
    scheduledEnd: "2026-10-14T09:00:00.000Z",
    lesson: "Piano Lesson",
    instructor: { id: "mock-instructor-1", name: "Terter" },
    room: { id: "mock-room-1", name: "Music Room 1" },
    status: "SCHEDULED",
  },
  {
    id: "mock-class-3",
    scheduledStart: "2026-10-16T07:00:00.000Z",
    scheduledEnd: "2026-10-16T08:00:00.000Z",
    lesson: "Practice Session",
    instructor: { id: "mock-instructor-1", name: "Terter" },
    room: { id: "mock-room-2", name: "Practice Room 2" },
    status: "SCHEDULED",
  },
];

export const mockRescheduleRequests = [];

export const mockStudentData = {
  dashboard: {
    student: {
      id: "mock-student-1",
      firstName: "Juan",
      lastName: "Santos",
    },
    enrollment: {
      id: "mock-enrollment-1",
      courseName: "Piano Lessons",
      instructorName: "Terter",
      scheduleDays: ["Monday", "Wednesday"],
      status: "ACTIVE",
    },
    upcomingClasses: studentSchedule.slice(0, 2),
    attendanceSummary: { present: 12, absent: 1, late: 2, rate: 80 },
    overallProgress: 75,
    paymentSummary: { outstandingAmount: 1500, nextDueDate: '2026-10-15T00:00:00.000Z' },
  },
  schedule: studentSchedule,
  attendance: {
    summary: { present: 12, absent: 1, late: 2, rate: 80 },
    records: [
      {
        id: "mock-attendance-1",
        scheduledStart: "2026-10-05T08:00:00.000Z",
        lesson: "Piano Lesson",
        instructor: { id: "mock-instructor-1", name: "Terter" },
        status: "PRESENT",
      },
      {
        id: "mock-attendance-2",
        scheduledStart: "2026-10-02T08:00:00.000Z",
        lesson: "Piano Lesson",
        instructor: { id: "mock-instructor-1", name: "Terter" },
        status: "LATE",
      },
      {
        id: "mock-attendance-3",
        scheduledStart: "2026-09-30T08:00:00.000Z",
        lesson: "Piano Lesson",
        instructor: { id: "mock-instructor-1", name: "Terter" },
        status: "ABSENT",
      },
    ],
  },
  progress: {
    overallProgress: 75,
    completedLessons: 9,
    totalLessons: 12,
    skills: [
      { id: "mock-skill-1", name: "Reading Musical Notes", progress: 90 },
      { id: "mock-skill-2", name: "Basic Chords", progress: 75 },
      { id: "mock-skill-3", name: "Finger Exercises", progress: 80 },
      { id: "mock-skill-4", name: "Rhythm and Timing", progress: 60 },
    ],
    feedback: [
      {
        id: "mock-feedback-1",
        attendanceId: "mock-attendance-1",
        message:
          "Your timing is improving. Keep practicing the assigned exercises.",
        createdAt: "2026-10-05T09:00:00.000Z",
        instructor: { id: "mock-instructor-1", name: "Terter" },
      },
    ],
  },
  materials: [
    {
      id: "mock-material-1",
      title: "Introduction to Music",
      description: "Basic concepts and fundamentals of music.",
      type: "READING",
      instructor: { id: "mock-instructor-1", name: "Terter" },
      fileUrl: null,
      status: "NOT_STARTED",
      uploadedAt: "2026-10-01T09:00:00.000Z",
    },
    {
      id: "mock-material-2",
      title: "Piano Finger Exercises",
      description: "Exercises for improving finger movement.",
      type: "PRACTICE_GUIDE",
      instructor: { id: "mock-instructor-1", name: "Terter" },
      fileUrl: null,
      status: "IN_PROGRESS",
      uploadedAt: "2026-10-03T09:00:00.000Z",
    },
    {
      id: "mock-material-3",
      title: "Basic Music Theory",
      description: "An introduction to the principles of music theory.",
      type: "PDF",
      instructor: { id: "mock-instructor-1", name: "Terter" },
      fileUrl: null,
      status: "COMPLETED",
      uploadedAt: "2026-10-05T09:00:00.000Z",
    },
  ],
  profile: {
    id: "mock-student-1",
    firstName: "Juan",
    lastName: "Santos",
    email: "client@example.com",
    phone: "+639000000001",
  },
  notifications: [
    {
      id: "mock-notification-1",
      message: "Your next piano lesson is coming up soon.",
      createdAt: "2026-10-06T01:00:00.000Z",
      readAt: null,
    },
    {
      id: "mock-notification-2",
      message: "A new practice guide was added to your materials.",
      createdAt: "2026-10-05T09:00:00.000Z",
      readAt: null,
    },
  ],
  payments: {
    currency: 'PHP',
    outstandingAmount: 1500,
    nextDueDate: '2026-10-15T00:00:00.000Z',
    records: [
      { id: 'mock-payment-1', description: 'October Piano Lessons', amount: 1500, status: 'DUE', dueDate: '2026-10-15T00:00:00.000Z', paidAt: null },
      { id: 'mock-payment-2', description: 'September Piano Lessons', amount: 1500, status: 'PAID', dueDate: '2026-09-15T00:00:00.000Z', paidAt: '2026-09-12T03:30:00.000Z' },
      { id: 'mock-payment-3', description: 'August Piano Lessons', amount: 1500, status: 'PAID', dueDate: '2026-08-15T00:00:00.000Z', paidAt: '2026-08-13T02:15:00.000Z' },
    ],
  },
};

export const mockInstructorData = {
  dashboard: {
    instructorName: "Mia Santos",
    assignedClients: [
      { id: "mock-client-1", name: "Liam Cruz" },
      { id: "mock-client-2", name: "Ava Reyes" },
      { id: "mock-client-3", name: "Noah Garcia" },
    ],
    todaySchedule: [
      {
        id: "mock-lesson-1",
        studentName: "Liam Cruz",
        lesson: "Piano Lesson",
        studentLevel: "Beginner",
        time: "10:00 AM",
        location: "Studio 1",
      },
      {
        id: "mock-lesson-2",
        studentName: "Ava Reyes",
        lesson: "Piano Lesson",
        studentLevel: "Intermediate",
        time: "1:30 PM",
        location: "Studio 2",
      },
    ],
    upcomingLessons: [],
    stats: {
      assignedStudents: 3,
      todaySessions: 2,
      pendingProgressNotes: 1,
    },
    studentProgress: [
      { id: "mock-client-1", name: "Liam Cruz", progress: 67 },
      { id: "mock-client-2", name: "Ava Reyes", progress: 83 },
      { id: "mock-client-3", name: "Noah Garcia", progress: 45 },
    ],
  },
  schedule: [
    {
      id: "mock-session-1",
      day_of_week: "Monday",
      lesson: "Piano Lesson",
      student: "Liam Cruz",
      time_slot: { start_time: "10:00:00", end_time: "11:00:00" },
    },
    {
      id: "mock-session-2",
      day_of_week: "Monday",
      lesson: "Piano Lesson",
      student: "Ava Reyes",
      time_slot: { start_time: "13:30:00", end_time: "14:30:00" },
    },
    {
      id: "mock-session-3",
      day_of_week: "Wednesday",
      lesson: "Piano Lesson",
      student: "Noah Garcia",
      time_slot: { start_time: "15:00:00", end_time: "16:00:00" },
    },
  ],
  timeSlots: [
    { id: "mock-time-1", start_time: "09:00:00", end_time: "10:00:00" },
    { id: "mock-time-2", start_time: "10:00:00", end_time: "11:00:00" },
    { id: "mock-time-3", start_time: "13:30:00", end_time: "14:30:00" },
    { id: "mock-time-4", start_time: "15:00:00", end_time: "16:00:00" },
  ],
  availability: [
    {
      id: "mock-availability-1",
      day_of_week: "Monday",
      time_slot_id: "mock-time-2",
      time_slot: { start_time: "10:00:00", end_time: "11:00:00" },
    },
    {
      id: "mock-availability-2",
      day_of_week: "Wednesday",
      time_slot_id: "mock-time-4",
      time_slot: { start_time: "15:00:00", end_time: "16:00:00" },
    },
  ],
  attendance: [
    {
      id: "mock-attendance-1",
      studentId: "mock-client-1",
      lesson: "Piano Lesson",
      student: "Liam Cruz",
      scheduledStart: "2026-10-05T10:00:00.000Z",
      status: "SCHEDULED",
      notes: "",
      completedLessons: 8,
      totalLessons: 12,
      progress: 67,
    },
    {
      id: "mock-attendance-2",
      studentId: "mock-client-2",
      lesson: "Piano Lesson",
      student: "Ava Reyes",
      scheduledStart: "2026-10-05T13:30:00.000Z",
      status: "SCHEDULED",
      notes: "",
      completedLessons: 10,
      totalLessons: 12,
      progress: 83,
    },
  ],
  profile: {
    id: "mock-instructor",
    firstName: "Mia",
    lastName: "Santos",
    email: "instructor@example.com",
    phone: "+639000000123",
    specialty: "Piano",
  },
  notifications: [
    { id: "mock-instructor-notification-1", message: "You have two lessons scheduled today.", createdAt: "2026-10-06T01:00:00.000Z", readAt: null },
    { id: "mock-instructor-notification-2", message: "Progress notes are ready to review.", createdAt: "2026-10-05T08:00:00.000Z", readAt: null },
  ],
};

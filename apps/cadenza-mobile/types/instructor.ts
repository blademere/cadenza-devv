export interface InstructorDashboardData {
  instructorName: string;
  assignedClients: Client[];
  todaySchedule: Lesson[];
  upcomingLessons: Lesson[];
  stats: {
    assignedStudents: number;
    todaySessions: number;
    pendingProgressNotes: number;
  };
  studentProgress: StudentProgress[];
}

export interface Client {
  id: string;
  name: string;
  avatar?: string;
}

export interface Lesson {
  id: string;
  studentName: string;
  studentLevel: string;
  time: string;
  location?: string;
  avatar?: string;
}

export interface StudentProgress {
  id: string;
  name: string;
  progress: number; // 0-100
  avatar?: string;
}

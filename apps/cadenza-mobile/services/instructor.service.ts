import axios from 'axios';

import type { InstructorDashboardData } from '../types/instructor';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const emptyDashboard: InstructorDashboardData = {
  instructorName: 'Instructor',
  assignedClients: [],
  todaySchedule: [],
  upcomingLessons: [],
  stats: {
    assignedStudents: 0,
    todaySessions: 0,
    pendingProgressNotes: 0,
  },
  studentProgress: [],
};

export async function getInstructorDashboard(): Promise<InstructorDashboardData> {
  try {
    const response = await api.get('/instructors/dashboard');

    if (response.data && typeof response.data === 'object') {
      return response.data as InstructorDashboardData;
    }
  } catch (error) {
    console.warn('Falling back to empty instructor dashboard:', error);
  }

  return emptyDashboard;
}
import api from './api';
import { isMockDataEnabled } from './dataMode';
import { mockInstructorData } from './mockData';

let mockAttendance = mockInstructorData.attendance.map((item) => ({ ...item }));

async function getResource(path, fixture) {
  if (await isMockDataEnabled()) return fixture;
  const response = await api.get(path);
  return response.data?.data ?? response.data;
}

export const getInstructorDashboard = () =>
  getResource('/instructor/dashboard', mockInstructorData.dashboard);

export const getInstructorSchedule = () =>
  getResource('/instructor/schedule', mockInstructorData.schedule);

export const getInstructorAttendance = () =>
  getResource('/instructor/attendance', mockAttendance);

export const getInstructorProfile = () =>
  getResource('/instructor/me', mockInstructorData.profile);

export const getInstructorNotifications = () =>
  getResource('/instructor/notifications', mockInstructorData.notifications);

export async function markInstructorAttendance(sessionId, status, notes = '') {
  if (await isMockDataEnabled()) {
    mockAttendance = mockAttendance.map((item) => {
      if (item.id !== sessionId) return item;
      const wasPresent = ['PRESENT', 'LATE'].includes(String(item.status || '').toUpperCase());
      const isPresent = ['PRESENT', 'LATE'].includes(String(status).toUpperCase());
      const totalLessons = Number(item.totalLessons || 0);
      const completedLessons = Math.max(
        0,
        Number(item.completedLessons || 0) + Number(isPresent) - Number(wasPresent),
      );
      const progress = totalLessons
        ? Math.round((completedLessons / totalLessons) * 100)
        : item.progress ?? 0;

      if (item.studentId && Array.isArray(mockInstructorData.dashboard.studentProgress)) {
        mockInstructorData.dashboard.studentProgress = mockInstructorData.dashboard.studentProgress.map((student) =>
          student.id === item.studentId ? { ...student, progress } : student,
        );
      }

      return {
        ...item,
        status,
        notes,
        completedLessons,
        progress,
        updatedAt: new Date().toISOString(),
      };
    });
    return mockAttendance.find((item) => item.id === sessionId) ?? null;
  }

  const response = await api.post(
    '/instructor/attendance',
    { sessionId, status, notes },
    {
      headers: {
        'Idempotency-Key': `mobile-attendance-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    },
  );
  return response.data?.data ?? response.data;
}

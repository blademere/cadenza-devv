import api from "./api";
import { isMockDataEnabled } from "./dataMode";
import { mockStudentData } from "./mockData";

async function getResource(path, fixture) {
  if (await isMockDataEnabled()) return fixture;

  const response = await api.get(path);
  return response.data?.data ?? response.data;
}

export const getStudentDashboard = () =>
  getResource("/student/dashboard", mockStudentData.dashboard);

export const getStudentSchedule = () =>
  getResource("/student/schedule", mockStudentData.schedule);

export const getStudentAttendance = () =>
  getResource("/student/attendance", mockStudentData.attendance);

export const getStudentProgress = () =>
  getResource("/student/progress", mockStudentData.progress);

export const getStudentMaterials = () =>
  getResource("/student/materials", mockStudentData.materials);

export async function getStudentMaterial(id) {
  if (await isMockDataEnabled()) {
    return mockStudentData.materials.find((item) => item.id === id) ?? null;
  }

  const response = await api.get(`/student/materials/${id}`);
  return response.data?.data ?? response.data;
}

export const getStudentProfile = () =>
  getResource("/student/profile", mockStudentData.profile);

export const getStudentNotifications = () =>
  getResource("/student/notifications", mockStudentData.notifications);

export const getStudentPayments = () =>
  getResource("/student/payments", mockStudentData.payments);

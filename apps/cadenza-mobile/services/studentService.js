import api from "./api";
import { isMockDataEnabled } from "./dataMode";
import { mockStudentData } from "./mockData";

async function getResource(path, fixture) {
  if (await isMockDataEnabled()) return fixture;

  const response = await api.get(path);
  return response.data?.data ?? response.data;
}

export async function getStudentDashboard() {
  const response = await api.get('/student/dashboard');
  return response.data?.data ?? response.data;
}

export async function getStudentSchedule() {
  const response = await api.get('/student/schedule');
  return response.data?.data ?? response.data;
}

export async function requestStudentSchedule(sessionId) {
  const response = await api.post(
    `/student/schedule/${sessionId}/request`,
    {},
    { headers: { 'Idempotency-Key': `mobile-schedule-${Date.now()}` } },
  );

  return response.data?.data ?? response.data;
}

export const getStudentAttendance = () =>
  getResource("/student/attendance", mockStudentData.attendance);

export const getStudentProgress = () =>
  getResource("/student/progress", mockStudentData.progress);

export async function getStudentMaterials() {
  const response = await api.get('/student/materials');
  return response.data?.data ?? response.data;
}

export async function getStudentMaterial(id) {
  const response = await api.get(`/student/materials/${id}`);
  return response.data?.data ?? response.data;
}

export const getStudentProfile = () =>
  getResource("/student/profile", mockStudentData.profile);

export const getStudentNotifications = () =>
  getResource("/student/notifications", mockStudentData.notifications);

export const getStudentPayments = () =>
  getResource("/student/payments", mockStudentData.payments);

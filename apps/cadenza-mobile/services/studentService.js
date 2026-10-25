import api from "./api";

export async function getStudentDashboard() {
  const response = await api.get('/student/dashboard');
  return response.data?.data ?? response.data;
}

export async function getStudentSchedule() {
  const response = await api.get('/student/schedule');
  return response.data?.data ?? response.data;
}

export async function getStudentProgress() {
  const response = await api.get('/student/progress');
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

export async function chooseStudentSchedule(sessionId, optionIds) {
  const response = await api.post(
    `/student/schedule/${sessionId}/choice`,
    { optionIds },
    { headers: { 'Idempotency-Key': `mobile-student-choice-${sessionId}-${Date.now()}` } },
  );
  return response.data?.data ?? response.data;
}

export async function getStudentMaterials() {
  const response = await api.get('/student/materials');
  return response.data?.data ?? response.data;
}

export async function getStudentMaterial(id) {
  const response = await api.get(`/student/materials/${id}`);
  return response.data?.data ?? response.data;
}

export async function getStudentProfile() {
  const response = await api.get('/auth/me');
  const data = response.data?.data ?? response.data;
  return data?.account?.person ?? data?.person ?? null;
}

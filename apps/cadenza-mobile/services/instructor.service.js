import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export async function getInstructorDashboard() {
  return unwrap(await api.get('/instructor/dashboard'));
}

export async function getInstructorSchedule() {
  const data = unwrap(await api.get('/instructor/schedule'));
  return data?.schedules ?? data ?? [];
}

export async function getInstructorAttendance() {
  const data = unwrap(await api.get('/instructor/attendance'));
  return data?.records ?? data ?? [];
}

export async function getInstructorProgress() {
  const data = unwrap(await api.get('/instructor/progress'));
  return data?.records ?? data ?? [];
}

export async function getInstructorProfile() {
  const data = unwrap(await api.get('/auth/me'));
  return data?.account?.person ?? data?.person ?? null;
}

export async function markInstructorAttendance(sessionId, status, notes = '') {
  const response = await api.post(
    '/instructor/attendance',
    { sessionId, status, notes },
    { headers: { 'Idempotency-Key': `mobile-attendance-${Date.now()}-${Math.random().toString(36).slice(2)}` } },
  );
  return unwrap(response);
}

export async function requestInstructorReschedule(sessionId, requestedStart, reason = '') {
  const response = await api.post(
    `/instructor/schedule/${sessionId}/request`,
    { requestedStart, reason },
    { headers: { 'Idempotency-Key': `mobile-instructor-reschedule-${Date.now()}-${Math.random().toString(36).slice(2)}` } },
  );
  return unwrap(response);
}

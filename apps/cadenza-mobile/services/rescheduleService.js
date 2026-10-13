import { mockRescheduleRequests } from './mockData';

export function getMockRescheduleRequest(sessionId) {
  return [...mockRescheduleRequests]
    .reverse()
    .find((request) => request.sessionId === sessionId && request.status === 'PENDING') ?? null;
}

export function createMockRescheduleRequest(payload) {
  const existing = getMockRescheduleRequest(payload.sessionId);
  if (existing) return existing;

  const request = {
    id: `mock-reschedule-${Date.now()}`,
    ...payload,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  mockRescheduleRequests.push(request);
  return request;
}

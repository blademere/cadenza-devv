const mockNotifications = [
  {
    id: 'mock-enrollment-1',
    type: 'ENROLLMENT',
    title: 'Enrollment submitted',
    message: 'Your enrollment is waiting for front desk confirmation.',
    createdAt: '2026-10-11T08:00:00.000Z',
    read: false,
  },
  {
    id: 'mock-payment-1',
    type: 'PAYMENT',
    title: 'Payment reference received',
    message: 'Your payment reference is ready for validation.',
    createdAt: '2026-10-10T08:00:00.000Z',
    read: false,
  },
  {
    id: 'mock-schedule-1',
    type: 'SCHEDULE',
    title: 'Schedule reminder',
    message: 'Check your enrollment details for your upcoming lesson schedule.',
    createdAt: '2026-10-09T08:00:00.000Z',
    read: true,
  },
];

// Replace this mock with GET /notifications when the backend endpoint is ready.
export async function getMyNotifications() {
  return Promise.resolve(mockNotifications.map((item) => ({ ...item })));
}

import api from './api';
import { isMockDataEnabled } from './dataMode';
import { mockInstructorData } from './mockData';

export async function getSchedule() {
  if (await isMockDataEnabled()) {
    return { data: { success: true, data: mockInstructorData.schedule } };
  }
  return api.get('/instructor/schedule');
}

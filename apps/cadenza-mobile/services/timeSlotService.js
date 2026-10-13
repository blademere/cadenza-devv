import { mockInstructorData } from './mockData';

export async function getTimeSlots() {
  return {
    data: {
      success: true,
      data: mockInstructorData.timeSlots,
    },
  };
}

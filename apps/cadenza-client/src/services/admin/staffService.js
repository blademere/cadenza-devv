import { apiClient } from '@/core/api/apiClient';

export const staffService = {
  async getStaff({ status = 'ALL', staffType = 'ALL' } = {}) {
    const params = new URLSearchParams();

    if (status && status !== 'ALL') {
      params.set('status', status);
    }

    if (staffType && staffType !== 'ALL') {
      params.set('staffType', staffType);
    }

    const query = params.toString();

    const response = await apiClient.get(`/staff${query ? `?${query}` : ''}`);
    let accounts = response?.data ?? [];
    if (staffType === 'ALL' || staffType === 'INSTRUCTOR') {
      const instructorsResponse = await apiClient.get('/instructors');
      const instructors = instructorsResponse?.data ?? [];
      accounts = [...accounts, ...instructors.map((instructor) => ({
        id: instructor.id,
        staffType: 'INSTRUCTOR',
        status: instructor.status || 'ACTIVE',
        createdAt: instructor.createdAt,
        person: instructor.person || { firstName: instructor.name, email: instructor.email },
      }))];
    }
    if (staffType === 'ALL' || staffType === 'CLIENT') {
      const studentsResponse = await apiClient.get('/students', { params: { page: 1, limit: 100 } });
      const students = studentsResponse?.data ?? [];
      accounts = [...accounts, ...students.map((student) => ({
        id: student.id,
        staffType: 'CLIENT',
        status: student.status === 'AT_RISK' ? 'ACTIVE' : (student.status || 'ACTIVE'),
        createdAt: student.createdAt,
        person: { firstName: student.name, email: student.email, phone: student.phone },
      }))];
    }
    return accounts.filter((account) => (!status || status === 'ALL' || account.status === status) && (!staffType || staffType === 'ALL' || account.staffType === staffType));
  },

  async createStaffAccount(data) {
    const response = await apiClient.post('/staff/accounts', data);

    return response?.data ?? null;
  },

  async updateStaff(id, data) {
    const response = await apiClient.patch(`/staff/${id}`, data);

    return response?.data ?? null;
  },

  async deactivateStaff(id) {
    const response = await apiClient.patch(`/staff/${id}/deactivate`);

    return response?.data ?? null;
  },
};

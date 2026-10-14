import { getAccount, getToken } from '../services/authStorage';

export async function getInitialRoute() {
  const [token, account] = await Promise.all([getToken(), getAccount()]);

  if (!token || !account) {
    return '/login';
  }

  if (account.type === 'CLIENT') {
    return '/student/dashboard';
  }

  if (account.type === 'STAFF') {
    return '/instructor/dashboard';
  }

  if (account.type === 'INSTRUCTOR') {
    return '/instructor/dashboard';
  }

  return '/login';
}

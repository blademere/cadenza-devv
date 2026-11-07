import { getAccount, getLastActivityAt, getToken, logout } from '../services/authStorage';

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000;

export async function getInitialRoute() {
  const [token, account, lastActivityAt] = await Promise.all([getToken(), getAccount(), getLastActivityAt()]);

  if (token && account && lastActivityAt && Date.now() - lastActivityAt >= INACTIVITY_LIMIT_MS) {
    await logout();
    return '/login?reason=inactive';
  }

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

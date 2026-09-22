import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../features/auth/components/AuthProvider';

export function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  return <Outlet />;
}

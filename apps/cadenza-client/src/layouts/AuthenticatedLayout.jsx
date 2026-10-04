import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '@/core/auth/useAuth';

export default function AuthenticatedLayout({ allowedStaffType, accountType }) {
  const { isAuthenticated, isLoading, account } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedStaffType) {
    const isAllowed =
      account?.type === 'STAFF' && account?.staffType === allowedStaffType;

    if (!isAllowed) {
      if (account?.staffType === 'ADMIN') {
        return <Navigate to="/admin" replace />;
      }

      if (account?.staffType === 'FRONT_DESK') {
        return <Navigate to="/front-desk" replace />;
      }

      if (account?.type === 'CLIENT') {
        return <Navigate to="/client" replace />;
      }

      return <Navigate to="/login" replace />;
    }
  }

  if (accountType) {
    const isAllowed = account?.type === accountType;

    if (!isAllowed) {
      if (account?.staffType === 'ADMIN') {
        return <Navigate to="/admin" replace />;
      }

      if (account?.staffType === 'FRONT_DESK') {
        return <Navigate to="/front-desk" replace />;
      }

      if (account?.type === 'CLIENT') {
        return <Navigate to="/client" replace />;
      }

      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}

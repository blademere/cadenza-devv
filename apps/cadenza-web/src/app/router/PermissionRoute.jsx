import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthorization } from '../../features/authorization/components/AuthorizationProvider'

export default function PermissionRoute({ permission }) {
  const { can, isLoading } = useAuthorization()
  const location = useLocation()
  if (isLoading) return null
  if (!can(permission)) return <Navigate to="/app/dashboard" replace state={{ from: location }} />
  return <Outlet />
}

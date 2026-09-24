import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthorization } from '../../features/authorization/components/AuthorizationProvider'

export default function PermissionRoute({ permission, anyPermissions, allPermissions }) {
  const { can, isLoading } = useAuthorization()
  const location = useLocation()
  if (isLoading) return null
  const allowed = permission ? can(permission) : allPermissions ? allPermissions.every((item) => can(item)) : anyPermissions?.some((item) => can(item))
  if (!allowed) return <Navigate to="/app/dashboard" replace state={{ from: location }} />
  return <Outlet />
}

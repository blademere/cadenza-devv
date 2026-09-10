import { Navigate, Outlet } from 'react-router-dom'
import { useCan } from '../useCan'

export default function RequireAnyPermission({ permissions = [], children, redirectTo = '/app/dashboard' }) {
  const can = useCan()
  const allowed = Array.isArray(permissions) && permissions.some((permission) => can(permission))

  if (!allowed) return <Navigate to={redirectTo} replace />
  return children ?? <Outlet />
}

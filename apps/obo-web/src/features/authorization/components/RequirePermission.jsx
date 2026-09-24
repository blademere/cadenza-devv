import { Navigate } from 'react-router-dom'
import { useCan } from '../useCan'

export default function RequirePermission({ permission, children, redirectTo = '/app/dashboard' }) {
  const can = useCan()

  if (!can(permission)) return <Navigate to={redirectTo} replace />
  return children
}

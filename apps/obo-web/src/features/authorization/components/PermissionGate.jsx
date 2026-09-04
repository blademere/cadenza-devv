import { useCan } from '../useCan'

export default function PermissionGate({ permission, children, fallback = null }) {
  const can = useCan()
  return can(permission) ? children : fallback
}

import { Button, Group } from '@mantine/core'
import { Link } from 'react-router-dom'
import PermissionGate from '../../authorization/components/PermissionGate'
import { permissions } from '../../../config/permissions'

export default function PermitTypeManagementActions({ permitType }) {
  const hasForm = Boolean(permitType?.formId || permitType?.form)

  return (
    <Group justify="flex-end">
      <PermissionGate permission={permissions.permitTypes.update}>
        <Button component={Link} to={`/app/permit-types/${permitType.id}`} variant="default" size="sm">
          Edit permit type
        </Button>
      </PermissionGate>
      <PermissionGate permission={permissions.forms.update}>
        {hasForm && (
          <Button component={Link} to={`/app/permit-types/${permitType.id}/form/edit`} variant="light" size="sm">
            Manage form
          </Button>
        )}
      </PermissionGate>
    </Group>
  )
}

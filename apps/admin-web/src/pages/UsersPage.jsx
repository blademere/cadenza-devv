import { useMemo, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, Chip, Divider, MenuItem, Select, Stack, Typography } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import { useAuthorizationRoles } from '../features/authorization/authorization.queries'
import { useAssignUserRole, useUsers } from '../features/users/users.queries'
import PageHeader from '../components/common/PageHeader'
import LoadingState from '../components/common/LoadingState'

const unwrap = (value) => value?.data ?? value

export default function UsersPage() {
  const [pendingRoles, setPendingRoles] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [saved, setSaved] = useState(null)

  const usersQuery = useUsers()
  const rolesQuery = useAuthorizationRoles()
  const assignRole = useAssignUserRole()
  const users = unwrap(usersQuery.data) ?? []
  const roles = unwrap(rolesQuery.data) ?? []
  const roleById = useMemo(() => new Map(roles.map((role) => [String(role.id), role])), [roles])
  const selectedRoleId = selectedUser ? String(pendingRoles[selectedUser.id] ?? selectedUser.role?.id ?? '') : ''
  const selectedRole = roleById.get(selectedRoleId)
  const error = usersQuery.error ?? rolesQuery.error ?? assignRole.error

  const saveRole = async () => {
    if (!selectedUser) return
    const roleId = pendingRoles[selectedUser.id]
    if (!roleId || String(roleId) === String(selectedUser.role?.id ?? '')) return
    setSaved(null)
    try {
      await assignRole.mutateAsync({ userId: selectedUser.id, roleId })
      setPendingRoles((current) => { const next = { ...current }; delete next[selectedUser.id]; return next })
      setSaved(selectedUser.id)
      const updatedUser = users.find((user) => user.id === selectedUser.id)
      if (updatedUser) setSelectedUser({ ...updatedUser, role: roleById.get(String(roleId)) ?? updatedUser.role })
    } catch {
      // React Query exposes the mutation error through assignRole.error.
    }
  }

  const loading = usersQuery.isLoading || rolesQuery.isLoading

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Authorization" title="Users" description="Assign users to roles. Effective permissions come from the selected role and all changes are enforced by the Express API." />
      {error && <Alert severity="error">{error.message || 'Unable to load or update users.'}</Alert>}
      {loading ? <Card variant="outlined"><LoadingState label="Loading users…" /></Card> : (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
          <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
            <Stack>
              <Box sx={{ p: 2.5 }}>
                <Typography variant="h6">Users</Typography>
                <Typography variant="body2" color="text.secondary">{users.length} users returned by the server</Typography>
              </Box>
              <Divider />
              {users.length === 0 ? <Typography sx={{ p: 2.5 }} color="text.secondary">No users found.</Typography> : users.map((user) => {
                const isSelected = selectedUser?.id === user.id
                return <Stack key={user.id} direction="row" alignItems="center" spacing={2} sx={{ px: 2.5, py: 1.75, bgcolor: isSelected ? 'action.selected' : 'transparent', borderBottom: 1, borderColor: 'divider' }}>
                  <Avatar sx={{ width: 38, height: 38 }}>{(user.name || user.email || '?').slice(0, 1).toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{user.name || user.email}</Typography>
                    {user.name && <Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>}
                    <Typography variant="caption" color={user.isActive ? 'success.main' : 'text.secondary'} display="block">{user.isActive ? 'Active' : 'Inactive'}</Typography>
                  </Box>
                  <Chip label={user.role?.name ?? 'No role'} size="small" variant="outlined" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
                  <Button size="small" variant={isSelected ? 'contained' : 'outlined'} onClick={() => setSelectedUser(user)}>{isSelected ? 'Selected' : 'Manage'}</Button>
                </Stack>
              })}
            </Stack>
          </Card>

          {selectedUser && <Card variant="outlined" sx={{ width: { xs: '100%', lg: 390 }, flexShrink: 0 }}>
            <Stack spacing={2.5} sx={{ p: 2.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">User</Typography>
                <Typography variant="h6" sx={{ mt: 0.5, wordBreak: 'break-word' }}>{selectedUser.name || selectedUser.email}</Typography>
                {selectedUser.name && <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Role</Typography>
                <Select fullWidth size="small" value={selectedRoleId} displayEmpty onChange={(event) => setPendingRoles((current) => ({ ...current, [selectedUser.id]: event.target.value }))}>
                  <MenuItem value="" disabled>Select a role</MenuItem>
                  {roles.map((role) => <MenuItem key={role.id} value={String(role.id)}>{role.name}</MenuItem>)}
                </Select>
              </Box>
              <Divider />
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2">Effective permissions</Typography>
                  <Chip label={selectedRole?.permissions?.length ?? 0} size="small" variant="outlined" />
                </Stack>
                <Stack spacing={0.75}>
                  {(selectedRole?.permissions ?? []).map((entry) => {
                    const permission = entry.permission ?? entry
                    const moduleKey = permission.module?.key ?? permission.resource ?? 'permission'
                    return <Typography key={permission.id} variant="body2" color="text.secondary">{moduleKey}:{permission.action}</Typography>
                  })}
                  {!selectedRole?.permissions?.length && <Typography variant="body2" color="text.secondary">No permissions granted.</Typography>}
                </Stack>
              </Box>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button variant="outlined" startIcon={<CloseIcon />} onClick={() => setSelectedUser(null)}>Close</Button>
                <Button variant="contained" startIcon={<SaveIcon />} disabled={!pendingRoles[selectedUser.id] || String(pendingRoles[selectedUser.id]) === String(selectedUser.role?.id ?? '') || assignRole.isPending} onClick={() => void saveRole()}>{assignRole.isPending ? 'Saving…' : 'Save role'}</Button>
              </Stack>
              {saved === selectedUser.id && <Alert severity="success">Role updated successfully.</Alert>}
            </Stack>
          </Card>}
        </Stack>
      )}
    </Stack>
  )
}

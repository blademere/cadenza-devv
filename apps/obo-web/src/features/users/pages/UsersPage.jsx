import { useMemo, useState } from 'react'
import { Alert, Avatar, Badge, Box, Button, Divider, Group, Modal, Select, SimpleGrid, Stack, Text } from '@mantine/core'
import { useAuthorizationRoles } from '../../authorization/queries/authorization.queries'
import { useUsers } from '../queries/users.queries'
import { useAssignUserRole } from '../mutations/users.mutations'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import LoadingState from '../../../components/common/LoadingState'

const unwrap = (value) => value?.data ?? value

export default function UsersPage() {
  const [pendingRoles, setPendingRoles] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [saved, setSaved] = useState(null)
  const usersQuery = useUsers()
  const rolesQuery = useAuthorizationRoles()
  const assignRole = useAssignUserRole()
  const users = useMemo(() => unwrap(usersQuery.data) ?? [], [usersQuery.data])
  const roles = useMemo(() => unwrap(rolesQuery.data) ?? [], [rolesQuery.data])
  const roleById = useMemo(() => new Map(roles.map((role) => [String(role.id), role])), [roles])
  const currentRoleId = (user) => user?.roles?.[0]?.id ?? null
  const selectedRoleId = selectedUser ? String(pendingRoles[selectedUser.id] ?? currentRoleId(selectedUser) ?? '') : ''
  const selectedRole = roleById.get(selectedRoleId)
  const error = usersQuery.error ?? rolesQuery.error ?? assignRole.error
  const loading = usersQuery.isLoading || rolesQuery.isLoading
  const roleOptions = useMemo(() => roles.map((role) => ({ value: String(role.id), label: role.name })), [roles])

  const openUser = (user) => { setSaved(null); setSelectedUser(user) }
  const saveRole = async () => {
    if (!selectedUser) return
    const roleId = pendingRoles[selectedUser.id]
    if (!roleId || String(roleId) === String(currentRoleId(selectedUser) ?? '')) return
    setSaved(null)
    try {
      await assignRole.mutateAsync({ userId: selectedUser.id, roleId })
      setPendingRoles((current) => { const next = { ...current }; delete next[selectedUser.id]; return next })
      setSaved(selectedUser.id)
      const updatedUser = users.find((user) => user.id === selectedUser.id)
      if (updatedUser) setSelectedUser({ ...updatedUser, roles: [roleById.get(String(roleId)) ?? updatedUser.roles?.[0]].filter(Boolean) })
    } catch { setSaved(null) }
  }

  return <Stack className="obo-page">
    <PageHeader eyebrow="Access management" title="Users" description="Review users and assign application roles from a focused access dialog." actions={<Badge color="indigo" variant="light">{users.length} users</Badge>} />
    {error && <Alert color="red" variant="light">{error.message || 'Unable to load or update users.'}</Alert>}
    {loading ? <Box className="obo-panel obo-page-loading"><LoadingState label="Loading users…" /></Box> : <Stack gap="md">
      <Box className="obo-panel" p="sm"><Text fw={700} size="sm">User directory</Text><Text size="xs" c="dimmed">Select a user to manage their application role and access.</Text></Box>
      {users.length === 0 ? <Box className="obo-panel"><EmptyState title="No users found" description="There are no users available to manage." /></Box> : <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">{users.map((user) => <Box key={user.id} className="obo-user-card"><Group wrap="nowrap" align="flex-start"><Avatar size="md" radius="xl">{(user.name || user.email || '?').slice(0, 1).toUpperCase()}</Avatar><Box style={{ minWidth: 0, flex: 1 }}><Group gap="xs" wrap="nowrap"><Text fw={650} size="sm" truncate>{user.name || user.email}</Text><Badge size="xs" color={user.isActive ? 'green' : 'gray'} variant="light">{user.isActive ? 'Active' : 'Inactive'}</Badge></Group>{user.name && <Text size="xs" c="dimmed" truncate mt={2}>{user.email}</Text>}<Group justify="space-between" mt="md"><Badge variant="light" color="indigo">{user.roles?.[0]?.name ?? 'No role'}</Badge><Button size="xs" variant="light" onClick={() => openUser(user)}>Manage</Button></Group></Box></Group></Box>)}</SimpleGrid>}
    </Stack>}
    <Modal opened={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title={<Box><Text fw={700}>Manage user access</Text><Text size="xs" c="dimmed">Assign the application role that determines this user's effective permissions.</Text></Box>} centered size="md" radius="md" overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}>
      {selectedUser && <Stack gap="lg"><Group wrap="nowrap"><Avatar size="lg" radius="xl">{(selectedUser.name || selectedUser.email || '?').slice(0, 1).toUpperCase()}</Avatar><Box style={{ minWidth: 0 }}><Text fw={700} truncate>{selectedUser.name || selectedUser.email}</Text>{selectedUser.name && <Text size="sm" c="dimmed" truncate>{selectedUser.email}</Text>}<Badge mt={5} size="sm" color={selectedUser.isActive ? 'green' : 'gray'} variant="light">{selectedUser.isActive ? 'Active' : 'Inactive'}</Badge></Box></Group><Divider /><Select label="Application role" description="The role controls this user's effective permissions in the current application." placeholder="Select a role" value={selectedRoleId || null} onChange={(value) => { setSaved(null); setPendingRoles((current) => ({ ...current, [selectedUser.id]: value })) }} data={roleOptions} searchable clearable /><Group justify="space-between"><Text size="sm" fw={650}>Effective permissions</Text><Badge variant="light" color="indigo">{selectedRole?.permissions?.length ?? 0}</Badge></Group><Box className="obo-user-permissions"><Stack gap={6}>{(selectedRole?.permissions ?? []).map((entry) => { const permission = entry.permission ?? entry; const moduleKey = permission.module?.key ?? permission.resource ?? 'permission'; return <Text key={permission.id} size="sm" c="dimmed">{moduleKey}:{permission.action}</Text> })}{!selectedRole?.permissions?.length && <Text size="sm" c="dimmed">No permissions granted.</Text>}</Stack></Box><Group justify="flex-end"><Button variant="default" onClick={() => setSelectedUser(null)}>Close</Button><Button disabled={!pendingRoles[selectedUser.id] || String(pendingRoles[selectedUser.id]) === String(currentRoleId(selectedUser) ?? '') || assignRole.isPending} loading={assignRole.isPending} onClick={() => void saveRole()}>Save role</Button></Group>{saved === selectedUser.id && <Alert color="green" variant="light">Application role updated successfully.</Alert>}</Stack>}
    </Modal>
  </Stack>
}

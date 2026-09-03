import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Box, Button, Checkbox, Divider, Group, Modal, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core'
import { authorizationApi } from '../features/authorization/authorization.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

const unwrap = (value) => value?.data ?? value
const permissionId = (entry) => entry.permissionId ?? entry.permission?.id ?? entry.id

export default function RolesPage() {
  const { load } = useAuthorization()
  const [modules, setModules] = useState([])
  const [roles, setRoles] = useState([])
  const [activeRoleId, setActiveRoleId] = useState(null)
  const [draft, setDraft] = useState([])
  const [savedPermissions, setSavedPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [opened, setOpened] = useState(false)

  const reload = useCallback(async () => {
    setError('')
    try {
      const [moduleResult, roleResult] = await Promise.all([authorizationApi.listModules(), authorizationApi.listRoles()])
      const nextModules = unwrap(moduleResult) ?? []
      const nextRoles = unwrap(roleResult) ?? []
      setModules(nextModules)
      setRoles(nextRoles)
      setActiveRoleId((current) => current ?? nextRoles[0]?.id ?? null)
      await load({ force: true })
    } catch (e) {
      setError(e.message || 'Unable to load authorization data.')
    } finally {
      setLoading(false)
    }
  }, [load])

  // Initial page loading is intentionally stateful; reload also handles its async lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload() }, [reload])

  const activeRole = roles.find((role) => String(role.id) === String(activeRoleId)) ?? null
  const allPermissions = useMemo(() => modules.flatMap((module) => (module.permissions ?? []).map((permission) => ({ ...permission, module }))), [modules])
  const permissionMap = useMemo(() => new Map(allPermissions.map((permission) => [String(permission.id), permission])), [allPermissions])
  const groupedPermissions = useMemo(() => modules.map((module) => ({ module, permissions: allPermissions.filter((permission) => permission.module.id === module.id) })).filter((group) => group.permissions.length), [modules, allPermissions])
  const dirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...savedPermissions].sort())

  const openRole = (role) => {
    setActiveRoleId(role.id)
    const selected = (role.permissions ?? []).map(permissionId).filter(Boolean).map(String)
    setDraft(selected)
    setSavedPermissions(selected)
    setSaved(false)
    setOpened(true)
  }
  const togglePermission = (id) => {
    const key = String(id)
    setSaved(false)
    setDraft((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])
  }
  const toggleModule = (permissions) => {
    const ids = permissions.map((permission) => String(permission.id))
    const allSelected = ids.every((id) => draft.includes(id))
    setDraft((current) => allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])])
    setSaved(false)
  }
  const save = async () => {
    if (!activeRole || !dirty) return
    setSaving(true); setError(''); setSaved(false)
    try {
      await authorizationApi.replaceRolePermissions(activeRole.id, draft)
      setRoles((current) => current.map((role) => role.id === activeRole.id ? { ...role, permissions: draft.map((id) => ({ permissionId: id, permission: permissionMap.get(String(id)) })) } : role))
      setSavedPermissions([...draft]); setSaved(true)
      await load({ force: true })
    } catch (e) { setError(e.message || 'Unable to save role permissions.') } finally { setSaving(false) }
  }

  return <Stack className="obo-page">
    <PageHeader eyebrow="Platform security" title="Roles" description="Select a role to quickly review and manage its permissions." actions={<Badge color="indigo" variant="light">{roles.length} roles</Badge>} />
    {error && <Alert color="red" variant="light" title="Something went wrong">{error}</Alert>}
    {loading ? <Box className="obo-panel obo-page-loading"><Text c="dimmed">Loading roles…</Text></Box> : <Stack gap="md"><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">{roles.map((role) => { const permissionCount = role.permissions?.length ?? 0; return <Box key={role.id} className="obo-role-card" role="button" tabIndex={0} onClick={() => openRole(role)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openRole(role) }}><Group justify="space-between" align="flex-start" wrap="nowrap"><Box style={{ minWidth: 0 }}><Text fw={700} className="obo-role-name" truncate>{role.name}</Text><Text size="xs" c="dimmed" mt={3} truncate>{role.key ?? 'Role'}</Text></Box><Badge variant="light" color="indigo">{permissionCount}</Badge></Group><Text size="sm" c="dimmed" mt="lg">{permissionCount ? `${permissionCount} permissions granted` : 'No permissions granted'}</Text><Button mt="md" variant="light" size="xs" onClick={(event) => { event.stopPropagation(); openRole(role) }}>Manage permissions</Button></Box> })}</SimpleGrid>{!roles.length && <Box className="obo-panel"><Text c="dimmed">No roles found.</Text></Box>}</Stack>}
    <Modal opened={opened} onClose={() => setOpened(false)} title={<Box><Text fw={700}>{activeRole?.name ?? 'Role permissions'}</Text><Text size="xs" c="dimmed">Select the capabilities granted to this role.</Text></Box>} centered size="lg" radius="md" overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}><Stack gap="md">{error && <Alert color="red" variant="light">{error}</Alert>}<Group justify="space-between"><Text size="sm" c="dimmed">{draft.length} of {allPermissions.length} permissions selected</Text>{dirty && <Badge color="yellow" variant="light">Unsaved changes</Badge>}</Group><ScrollArea h={{ base: 400, sm: 480 }} offsetScrollbars><Stack gap="md" pr="sm">{groupedPermissions.map(({ module, permissions }) => { const ids = permissions.map((permission) => String(permission.id)); const selectedCount = ids.filter((id) => draft.includes(id)).length; return <Box key={module.id} className="obo-permission-group"><Group justify="space-between" mb="xs"><Box><Text fw={700} size="sm">{module.name}</Text><Text size="xs" c="dimmed">{module.key}</Text></Box><Button variant="subtle" size="compact-xs" onClick={() => toggleModule(permissions)}>{selectedCount === permissions.length ? 'Clear all' : 'Select all'}</Button></Group><Stack gap={0}>{permissions.map((permission, index) => <Box key={permission.id} className="obo-permission-row" style={index ? { borderTop: '1px solid var(--mantine-color-gray-2)' } : undefined}><Checkbox checked={draft.includes(String(permission.id))} onChange={() => togglePermission(permission.id)} label={<Box><Text size="sm" fw={600}>{permission.action}</Text><Text size="xs" c="dimmed">{permission.description ?? `Allows ${permission.action} access to ${module.name}.`}</Text></Box>} /></Box>)}</Stack></Box>})}</Stack></ScrollArea><Divider /><Group justify="space-between" wrap="wrap"><Text size="xs" c="dimmed">Changes are enforced by the Express API.</Text><Group gap="xs"><Button variant="default" disabled={!dirty || saving} onClick={() => { setDraft([...savedPermissions]); setSaved(false) }}>Reset</Button><Button disabled={!dirty || saving} loading={saving} onClick={() => void save()}>Save changes</Button></Group></Group>{saved && <Alert color="green" variant="light">Role permissions updated successfully.</Alert>}</Stack></Modal>
  </Stack>
}
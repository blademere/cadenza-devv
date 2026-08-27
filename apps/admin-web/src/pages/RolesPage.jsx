import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Box, Button, Card, Divider, Group, SimpleGrid, Stack, Switch, Text, Title } from '@mantine/core'
import { authorizationApi } from '../features/authorization/authorization.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

const unwrap = (value) => value?.data ?? value
const permissionId = (entry) => entry.permissionId ?? entry.permission?.id ?? entry.id

export default function RolesPage() {
  const { context, load } = useAuthorization()
  const [modules, setModules] = useState([]); const [roles, setRoles] = useState([]); const [activeRoleId, setActiveRoleId] = useState(null)
  const [draft, setDraft] = useState([]); const [savedPermissions, setSavedPermissions] = useState([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false)
  const reload = useCallback(async () => { setLoading(true); setError(''); try { const [moduleResult, roleResult] = await Promise.all([authorizationApi.listModules(), authorizationApi.listRoles()]); const nextModules = unwrap(moduleResult) ?? []; const nextRoles = unwrap(roleResult) ?? []; setModules(nextModules); setRoles(nextRoles); setActiveRoleId((current) => current ?? nextRoles[0]?.id ?? null); await load({ force: true }) } catch (e) { setError(e.message || 'Unable to load authorization data.') } finally { setLoading(false) } }, [load])
  useEffect(() => { void reload() }, [reload])
  const activeRole = roles.find((role) => String(role.id) === String(activeRoleId)) ?? null
  const allPermissions = useMemo(() => modules.flatMap((module) => (module.permissions ?? []).map((permission) => ({ ...permission, module }))), [modules])
  const permissionMap = useMemo(() => new Map(allPermissions.map((permission) => [String(permission.id), permission])), [allPermissions])
  const dirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...savedPermissions].sort())
  useEffect(() => { if (!activeRole) { setDraft([]); setSavedPermissions([]); return }; const selected = (activeRole.permissions ?? []).map(permissionId).filter(Boolean).map(String); setDraft(selected); setSavedPermissions(selected); setSaved(false); setError('') }, [activeRole])
  const togglePermission = (id) => { const key = String(id); setSaved(false); setDraft((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]) }
  const save = async () => { if (!activeRole || !dirty) return; setSaving(true); setError(''); setSaved(false); try { await authorizationApi.replaceRolePermissions(activeRole.id, draft); setRoles((current) => current.map((role) => role.id === activeRole.id ? { ...role, permissions: draft.map((id) => ({ permissionId: id, permission: permissionMap.get(String(id)) })) } : role)); setSavedPermissions([...draft]); setSaved(true); await load({ force: true }) } catch (e) { setError(e.message || 'Unable to save role permissions.') } finally { setSaving(false) } }
  const groupedPermissions = useMemo(() => modules.map((module) => ({ module, permissions: allPermissions.filter((permission) => permission.module.id === module.id) })).filter((group) => group.permissions.length), [modules, allPermissions])
  return <Stack gap="xl">
    <PageHeader eyebrow="Platform security" title="Roles" description="Manage roles and their permission actions with the Express server as the source of truth." actions={<Badge color="blue" variant="light">{context?.role?.name ?? 'Administrator'}</Badge>} />
    {error && <Alert color="red">{error}</Alert>}
    {loading ? <Card withBorder><Text c="dimmed" p="xl">Loading roles…</Text></Card> : <Group align="flex-start" gap="xl" wrap="wrap">
      <Card withBorder w={{ base: '100%', lg: 300 }} style={{ flexShrink: 0 }} p="md"><Stack gap="xs"><Box px="xs" py="sm"><Title order={4}>Roles</Title><Text size="sm" c="dimmed">Choose a role to manage.</Text></Box>{roles.map((role) => { const selected = String(role.id) === String(activeRoleId); return <Button key={role.id} fullWidth variant={selected ? 'filled' : 'subtle'} justify="space-between" onClick={() => setActiveRoleId(role.id)}><Box ta="left"><Text size="sm" fw={600}>{role.name}</Text><Text size="xs" c={selected ? 'blue.0' : 'dimmed'}>{role.key ?? 'Role'}</Text></Box><Badge variant={selected ? 'white' : 'light'}>{role.permissions?.length ?? 0}</Badge></Button> })}</Stack></Card>
      {activeRole && <Card withBorder style={{ flex: 1, minWidth: 0 }} p={0}><Stack gap={0}><Box p="xl"><Group justify="space-between" align="flex-start"><Box><Title order={3}>{activeRole.name}</Title><Text size="sm" c="dimmed" mt={4}>Configure the permission actions granted to this role.</Text></Box><Badge color={dirty ? 'yellow' : 'green'} variant="light">{dirty ? 'Unsaved changes' : `${draft.length} granted`}</Badge></Group></Box><Divider /><Stack gap="xl" p={{ base: 'md', md: 'xl' }}>{groupedPermissions.map(({ module, permissions }) => <Box key={module.id}><Text fw={700}>{module.name}</Text><Text size="xs" c="dimmed">{module.key}</Text><Card withBorder mt="sm" p={0}>{permissions.map((permission, index) => <Group key={permission.id} justify="space-between" wrap="nowrap" px="md" py="sm" style={index ? { borderTop: '1px solid var(--mantine-color-gray-3)' } : undefined}><Box style={{ flex: 1 }}><Text size="sm" fw={600}>{module.key}:{permission.action}</Text><Text size="xs" c="dimmed">{permission.description ?? `Allows ${permission.action} access to ${module.name}.`}</Text></Box><Switch checked={draft.includes(String(permission.id))} onChange={() => togglePermission(permission.id)} disabled={saving} /></Group>)}</Card></Box>)}</Stack><Divider /><Group justify="space-between" p="md"><Text size="sm" c="dimmed">{draft.length} permissions granted</Text><Group gap="xs"><Button variant="default" disabled={!dirty || saving} onClick={() => { setDraft([...savedPermissions]); setSaved(false) }}>Cancel</Button><Button disabled={!dirty || saving} loading={saving} onClick={() => void save()}>Save changes</Button></Group></Group>{saved && <Alert color="green" mx="md" mb="md">Role permissions updated successfully.</Alert>}</Stack></Card>}
    </Group>}
  </Stack>
}

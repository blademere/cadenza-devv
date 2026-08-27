import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { authorizationApi } from '../features/authorization/authorization.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import PageHeader from '../components/common/PageHeader'

const unwrap = (value) => value?.data ?? value
const permissionId = (entry) => entry.permissionId ?? entry.permission?.id ?? entry.id

export default function RolesPage() {
  const { context, load } = useAuthorization()
  const [modules, setModules] = useState([])
  const [roles, setRoles] = useState([])
  const [activeRoleId, setActiveRoleId] = useState(null)
  const [draft, setDraft] = useState([])
  const [savedPermissions, setSavedPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [moduleResult, roleResult] = await Promise.all([
        authorizationApi.listModules(),
        authorizationApi.listRoles(),
      ])
      const nextModules = unwrap(moduleResult) ?? []
      const nextRoles = unwrap(roleResult) ?? []
      setModules(nextModules)
      setRoles(nextRoles)
      setActiveRoleId((current) => current ?? nextRoles[0]?.id ?? null)
      await load({ force: true })
    } catch (nextError) {
      setError(nextError.message || 'Unable to load authorization data.')
    } finally {
      setLoading(false)
    }
  }, [load])

  useEffect(() => { void reload() }, [reload])

  const activeRole = roles.find((role) => String(role.id) === String(activeRoleId)) ?? null
  const allPermissions = useMemo(
    () => modules.flatMap((module) => (module.permissions ?? []).map((permission) => ({ ...permission, module }))),
    [modules],
  )
  const permissionMap = useMemo(
    () => new Map(allPermissions.map((permission) => [String(permission.id), permission])),
    [allPermissions],
  )
  const dirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...savedPermissions].sort())

  useEffect(() => {
    if (!activeRole) {
      setDraft([])
      setSavedPermissions([])
      return
    }
    const selected = (activeRole.permissions ?? []).map(permissionId).filter(Boolean).map(String)
    setDraft(selected)
    setSavedPermissions(selected)
    setSaved(false)
    setError('')
  }, [activeRole])

  const togglePermission = (id) => {
    const key = String(id)
    setSaved(false)
    setDraft((current) => current.includes(key)
      ? current.filter((value) => value !== key)
      : [...current, key])
  }

  const save = async () => {
    if (!activeRole || !dirty) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await authorizationApi.replaceRolePermissions(activeRole.id, draft)
      setRoles((current) => current.map((role) => role.id === activeRole.id
        ? { ...role, permissions: draft.map((id) => ({ permissionId: id, permission: permissionMap.get(String(id)) })) }
        : role))
      setSavedPermissions([...draft])
      setSaved(true)
      await load({ force: true })
    } catch (nextError) {
      setError(nextError.message || 'Unable to save role permissions.')
    } finally {
      setSaving(false)
    }
  }

  const groupedPermissions = useMemo(
    () => modules
      .map((module) => ({ module, permissions: allPermissions.filter((permission) => permission.module.id === module.id) }))
      .filter((group) => group.permissions.length),
    [modules, allPermissions],
  )

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Platform security"
        title="Roles"
        description="Manage roles and their permission actions with the Express server as the source of truth."
        actions={<Chip icon={<ShieldOutlinedIcon />} label={context?.role?.name ?? 'Administrator'} color="primary" variant="outlined" />}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? (
        <Card><CardContent><Typography color="text.secondary">Loading roles…</Typography></CardContent></Card>
      ) : (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
          <Card sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Box sx={{ px: 1, py: 1.25 }}>
                <Typography variant="h6">Roles</Typography>
                <Typography variant="body2" color="text.secondary">Choose a role to manage.</Typography>
              </Box>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {roles.map((role) => {
                  const selected = String(role.id) === String(activeRoleId)
                  return (
                    <Button key={role.id} fullWidth variant={selected ? 'contained' : 'text'} onClick={() => setActiveRoleId(role.id)} sx={{ justifyContent: 'space-between', textAlign: 'left', px: 1.5, py: 1.25 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={650}>{role.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{role.key ?? 'Role'}</Typography>
                      </Box>
                      <Chip size="small" label={role.permissions?.length ?? 0} variant={selected ? 'filled' : 'outlined'} />
                    </Button>
                  )
                })}
              </Stack>
            </CardContent>
          </Card>
          {activeRole && (
            <Card sx={{ flex: 1, width: '100%' }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Stack>
                  <Box sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="h5">{activeRole.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Configure the permission actions granted to this role.</Typography>
                      </Box>
                      <Chip color={dirty ? 'warning' : 'success'} variant="outlined" label={dirty ? 'Unsaved changes' : `${draft.length} granted`} />
                    </Stack>
                  </Box>
                  <Divider />
                  <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
                    {groupedPermissions.map(({ module, permissions }) => (
                      <Box key={module.id}>
                        <Typography variant="subtitle1" fontWeight={700}>{module.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{module.key}</Typography>
                        <Card variant="outlined" sx={{ mt: 1.25, boxShadow: 'none' }}>
                          {permissions.map((permission, index) => (
                            <Box key={permission.id} sx={{ px: 2, py: 1.25, borderTop: index ? 1 : 0, borderColor: 'divider' }}>
                              <FormControlLabel
                                label={<Box><Typography variant="body2" fontWeight={600}>{module.key}:{permission.action}</Typography><Typography variant="caption" color="text.secondary">{permission.description ?? `Allows ${permission.action} access to ${module.name}.`}</Typography></Box>}
                                control={<Switch checked={draft.includes(String(permission.id))} onChange={() => togglePermission(permission.id)} disabled={saving} />}
                                labelPlacement="start"
                                sx={{ width: '100%', m: 0, justifyContent: 'space-between', gap: 2, '& .MuiFormControlLabel-label': { flex: 1 } }}
                              />
                            </Box>
                          ))}
                        </Card>
                      </Box>
                    ))}
                  </Stack>
                  <Divider />
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ p: 2.5 }}>
                    <Typography variant="body2" color="text.secondary">{draft.length} permissions granted</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" startIcon={<UndoIcon />} disabled={!dirty || saving} onClick={() => { setDraft([...savedPermissions]); setSaved(false) }}>Cancel</Button>
                      <Button variant="contained" startIcon={<SaveIcon />} disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Button>
                    </Stack>
                  </Stack>
                  {saved && <Alert severity="success" sx={{ mx: 2.5, mb: 2.5 }}>Role permissions updated successfully.</Alert>}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Stack>
  )
}

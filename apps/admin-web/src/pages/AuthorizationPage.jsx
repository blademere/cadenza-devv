import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, Chip, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import PeopleIcon from '@mui/icons-material/People'
import { authorizationApi } from '../features/authorization/authorization.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value
const permissionId = (entry) => entry.permissionId ?? entry.permission?.id ?? entry.id

export default function AuthorizationPage() {
  const navigate = useNavigate()
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
      const [moduleResult, roleResult] = await Promise.all([authorizationApi.listModules(), authorizationApi.listRoles()])
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
  const allPermissions = useMemo(() => modules.flatMap((module) => (module.permissions ?? []).map((permission) => ({ ...permission, module }))), [modules])
  const permissionMap = useMemo(() => new Map(allPermissions.map((permission) => [String(permission.id), permission])), [allPermissions])
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
    setDraft((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])
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

  const groupedPermissions = useMemo(() => modules
    .map((module) => ({ module, permissions: allPermissions.filter((permission) => permission.module.id === module.id) }))
    .filter((group) => group.permissions.length), [modules, allPermissions])

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'flex-end' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">Platform security</Typography>
            <Typography variant="h3" sx={{ mt: 0.5, mb: 1 }}>Authorization</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>Manage roles and their permissions. The Express server remains the source of truth for authorization and rejects unauthorized operations.</Typography>
          </Box>
          <Chip label={context?.role?.name ?? 'Administrator'} variant="outlined" />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
          <Button variant="contained" size="small">Roles</Button>
          <Button variant="text" size="small" startIcon={<PeopleIcon />} onClick={() => navigate('/authorization/users')}>Users</Button>
        </Stack>

        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {loading ? <Card variant="outlined"><Typography sx={{ p: 3 }} color="text.secondary">Loading authorization…</Typography></Card> : (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
            <Card variant="outlined" sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
              <Box sx={{ p: 2.5 }}>
                <Typography variant="h6">Roles</Typography>
                <Typography variant="body2" color="text.secondary">Choose a role to manage.</Typography>
              </Box>
              <Divider />
              <Stack sx={{ p: 1 }}>
                {roles.map((role) => {
                  const selected = String(role.id) === String(activeRoleId)
                  return <Button key={role.id} fullWidth variant={selected ? 'contained' : 'text'} onClick={() => setActiveRoleId(role.id)} sx={{ justifyContent: 'space-between', textAlign: 'left', px: 1.5, py: 1.25 }}>
                    <Box><Typography variant="body2" fontWeight={600}>{role.name}</Typography><Typography variant="caption" color="text.secondary">{role.key ?? 'Role'}</Typography></Box>
                    <Chip size="small" label={role.permissions?.length ?? 0} variant="outlined" />
                  </Button>
                })}
              </Stack>
            </Card>

            {activeRole && <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
              <Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} justifyContent="space-between" spacing={2} sx={{ p: 2.5 }}>
                  <Box><Typography variant="h5">{activeRole.name}</Typography><Typography variant="body2" color="text.secondary">Toggle permissions for this role. Changes are submitted to the server as one replacement operation.</Typography></Box>
                  <Chip color={dirty ? 'warning' : 'success'} variant="outlined" label={dirty ? 'Unsaved changes' : `${draft.length} granted`} />
                </Stack>
                <Divider />
                <Stack spacing={3} sx={{ p: { xs: 2, md: 2.5 } }}>
                  {groupedPermissions.map(({ module, permissions }) => <Box key={module.id}>
                    <Typography variant="subtitle2">{module.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{module.key}</Typography>
                    <Card variant="outlined" sx={{ mt: 1 }}>
                      {permissions.map((permission, index) => {
                        const checked = draft.includes(String(permission.id))
                        return <Box key={permission.id} sx={{ px: 2, py: 1.25, borderTop: index ? 1 : 0, borderColor: 'divider' }}>
                          <FormControlLabel
                            label={<Box><Typography variant="body2" fontWeight={600}>{module.key}:{permission.action}</Typography><Typography variant="caption" color="text.secondary">{permission.description ?? `Allows ${permission.action} access to ${module.name}.`}</Typography></Box>}
                            control={<Switch checked={checked} onChange={() => togglePermission(permission.id)} disabled={saving} />}
                            labelPlacement="start"
                            sx={{ width: '100%', m: 0, justifyContent: 'space-between', gap: 2, '& .MuiFormControlLabel-label': { flex: 1 } }}
                          />
                        </Box>
                      })}
                    </Card>
                  </Box>)}
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
            </Card>}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authorizationApi } from '../features/authorization/authorization.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Box } from '../../components/ui/box'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Divider } from '../../components/ui/divider'
import { Switch } from '../../components/ui/switch'

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
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
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
      setError(nextError.message)
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
    setError(null)
  }, [activeRoleId, activeRole])

  const togglePermission = (id) => {
    const key = String(id)
    setSaved(false)
    setDraft((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])
  }

  const save = async () => {
    if (!activeRole || !dirty) return
    setSaving(true)
    setError(null)
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
      setError(nextError.message)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft([...savedPermissions])
    setSaved(false)
  }

  const groupedPermissions = useMemo(() => modules.map((module) => ({ module, permissions: allPermissions.filter((permission) => permission.module.id === module.id) })).filter((group) => group.permissions.length), [modules, allPermissions])

  return (
    <VStack space="lg" className="mx-auto w-full max-w-7xl">
      <HStack className="items-end justify-between gap-4">
        <VStack space="xs">
          <Text size="sm" className="text-muted-foreground">Platform security</Text>
          <Heading size="xl">Authorization</Heading>
          <Text className="max-w-2xl text-muted-foreground">Manage roles and the permissions assigned to them. The server remains the authority for authorization enforcement.</Text>
        </VStack>
        <Badge variant="outline"><BadgeText>{context?.role?.name ?? 'Administrator'}</BadgeText></Badge>
      </HStack>

      <HStack className="gap-2 border-b border-outline-200 pb-2"><Button size="sm" variant="solid"><ButtonText>Roles</ButtonText></Button><Button size="sm" variant="outline" onPress={() => navigate('/authorization/users')}><ButtonText>Users</ButtonText></Button></HStack>

      {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">{error}</Text></Card>}
      {loading ? <Card variant="outline" className="p-6"><Text className="text-muted-foreground">Loading authorization…</Text></Card> : (
        <HStack className="items-start gap-6 lg:flex-row">
          <Card variant="outline" className="w-full p-0 lg:w-[290px] lg:shrink-0"><VStack>
            <VStack space="xs" className="px-5 py-4"><Heading size="md">Roles</Heading><Text size="sm" className="text-muted-foreground">Choose a role to manage.</Text></VStack>
            <Divider />
            {roles.map((role) => <Button key={role.id} variant={String(role.id) === String(activeRoleId) ? 'solid' : 'link'} className="justify-start rounded-none px-5 py-4" onPress={() => setActiveRoleId(role.id)}><HStack className="w-full items-center justify-between"><VStack space="none" className="items-start"><ButtonText>{role.name}</ButtonText><Text size="2xs" className="text-muted-foreground">{role.key ?? 'Role'}</Text></VStack><Badge variant="outline"><BadgeText>{role.permissions?.length ?? 0}</BadgeText></Badge></HStack></Button>)}
          </VStack></Card>

          {activeRole && <Card variant="outline" className="min-w-0 flex-1 p-0"><VStack>
            <HStack className="items-start justify-between gap-4 px-5 py-5"><VStack space="xs"><Heading size="lg">{activeRole.name}</Heading><Text size="sm" className="text-muted-foreground">Toggle permissions for this role. Changes are saved as one transaction.</Text></VStack><Badge action={dirty ? 'warning' : 'success'} variant="outline"><BadgeText>{dirty ? 'Unsaved changes' : `${draft.length} granted`}</BadgeText></Badge></HStack>
            <Divider />
            <VStack space="lg" className="p-5">
              {groupedPermissions.map(({ module, permissions }) => <VStack key={module.id} space="sm"><VStack space="none"><Text size="sm" bold>{module.name}</Text><Text size="2xs" className="text-muted-foreground">{module.key}</Text></VStack><Card variant="outline" className="p-0"><VStack>{permissions.map((permission, index) => { const checked = draft.includes(String(permission.id)); return <HStack key={permission.id} className={`items-center justify-between px-4 py-3 ${index ? 'border-t border-outline-100' : ''}`}><VStack space="none" className="min-w-0"><Text size="sm" bold>{module.key}:{permission.action}</Text><Text size="2xs" className="text-muted-foreground">{permission.description ?? `Allows ${permission.action} access to ${module.name}.`}</Text></VStack><Switch value={checked} onValueChange={() => togglePermission(permission.id)} isDisabled={saving} accessibilityLabel={`Toggle ${module.key}:${permission.action}`} /></HStack>})}</VStack></Card></VStack>)}
            </VStack>
            <Divider />
            <HStack className="items-center justify-between px-5 py-4"><Text size="sm" className="text-muted-foreground">{draft.length} permissions granted</Text><HStack className="gap-2"><Button variant="outline" isDisabled={!dirty || saving} onPress={cancel}><ButtonText>Cancel</ButtonText></Button><Button isDisabled={!dirty || saving} onPress={save}><ButtonText>{saving ? 'Saving…' : 'Save changes'}</ButtonText></Button></HStack></HStack>
            {saved && <Text size="sm" className="px-5 pb-4 text-success-700">Role permissions updated successfully.</Text>}
          </VStack></Card>}
        </HStack>
      )}
    </VStack>
  )
}

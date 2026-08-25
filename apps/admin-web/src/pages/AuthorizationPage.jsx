import { useCallback, useEffect, useMemo, useState } from 'react'
import { authorizationApi } from '../features/authorization/authorization.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Box } from '../../components/ui/box'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Input, InputField } from '../../components/ui/input'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Divider } from '../../components/ui/divider'

const unwrap = (value) => value?.data ?? value

export default function AuthorizationPage() {
  const { context, load } = useAuthorization()
  const [modules, setModules] = useState([])
  const [roles, setRoles] = useState([])
  const [activeView, setActiveView] = useState('modules')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [newModule, setNewModule] = useState({ key: '', name: '', description: '' })

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [moduleResult, roleResult] = await Promise.all([
        authorizationApi.listModules(),
        authorizationApi.listRoles(),
      ])
      setModules(unwrap(moduleResult) ?? [])
      setRoles(unwrap(roleResult) ?? [])
      await load()
    } catch (nextError) {
      setError(nextError.message)
    }
  }, [load])

  useEffect(() => { reload() }, [reload])

  const allPermissions = useMemo(() => modules.flatMap((module) =>
    (module.permissions ?? []).map((permission) => ({ ...permission, module }))), [modules])

  const toggleModule = async (module) => {
    setBusy(true)
    setError(null)
    try {
      await authorizationApi.setModuleActive(module.id, !module.isActive)
      await reload()
    } catch (nextError) {
      setError(nextError.message)
    } finally { setBusy(false) }
  }

  const createModule = async () => {
    setBusy(true)
    setError(null)
    try {
      await authorizationApi.createModule(newModule)
      setNewModule({ key: '', name: '', description: '' })
      await reload()
    } catch (nextError) {
      setError(nextError.message)
    } finally { setBusy(false) }
  }

  const addPermission = async (module) => {
    const action = window.prompt(`Add an action to ${module.name}`, 'read')
    if (!action) return
    setBusy(true)
    setError(null)
    try {
      await authorizationApi.addPermission(module.id, { action: action.trim() })
      await reload()
    } catch (nextError) {
      setError(nextError.message)
    } finally { setBusy(false) }
  }

  const updateRole = async (role, permissionIds) => {
    setBusy(true)
    setError(null)
    try {
      await authorizationApi.replaceRolePermissions(role.id, permissionIds)
      await reload()
    } catch (nextError) {
      setError(nextError.message)
    } finally { setBusy(false) }
  }

  return (
    <VStack space="lg" className="mx-auto w-full max-w-7xl">
      <HStack className="items-end justify-between gap-4">
        <VStack space="xs">
          <Text size="sm" className="text-muted-foreground">Platform security</Text>
          <Heading size="xl">Authorization</Heading>
          <Text className="max-w-2xl text-muted-foreground">Manage modules, permissions, roles, and the capabilities exposed to administrators.</Text>
        </VStack>
        <Badge variant="outline"><BadgeText>{context?.role?.name ?? context?.role?.key ?? 'Role'}</BadgeText></Badge>
      </HStack>

      {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">{error}</Text></Card>}

      <HStack className="gap-2 border-b border-outline-200 pb-2">
        <Button size="sm" variant={activeView === 'modules' ? 'solid' : 'outline'} onPress={() => setActiveView('modules')}><ButtonText>Modules & permissions</ButtonText></Button>
        <Button size="sm" variant={activeView === 'roles' ? 'solid' : 'outline'} onPress={() => setActiveView('roles')}><ButtonText>Roles</ButtonText></Button>
      </HStack>

      {activeView === 'modules' ? (
        <VStack space="md">
          <Card variant="outline" className="p-5">
            <VStack space="md">
              <VStack space="xs"><Heading size="md">Add module</Heading><Text size="sm" className="text-muted-foreground">Create a platform capability group. The server remains the authority for enforcement.</Text></VStack>
              <HStack className="flex-wrap gap-3">
                <Input className="min-w-[180px] flex-1"><InputField placeholder="key e.g. inspections" value={newModule.key} onChangeText={(key) => setNewModule((v) => ({ ...v, key }))} /></Input>
                <Input className="min-w-[180px] flex-1"><InputField placeholder="Display name" value={newModule.name} onChangeText={(name) => setNewModule((v) => ({ ...v, name }))} /></Input>
                <Input className="min-w-[240px] flex-[2]"><InputField placeholder="Description (optional)" value={newModule.description} onChangeText={(description) => setNewModule((v) => ({ ...v, description }))} /></Input>
                <Button isDisabled={busy || !newModule.key || !newModule.name} onPress={createModule}><ButtonText>Create</ButtonText></Button>
              </HStack>
            </VStack>
          </Card>

          {modules.map((module) => (
            <Card key={module.id} variant="outline" className="p-5">
              <HStack className="items-start justify-between gap-4">
                <VStack space="xs" className="min-w-0 flex-1">
                  <HStack className="items-center gap-2"><Heading size="md">{module.name}</Heading><Badge action={module.isActive ? 'success' : 'muted'} variant="outline"><BadgeText>{module.isActive ? 'Active' : 'Inactive'}</BadgeText></Badge></HStack>
                  <Text size="sm" className="text-muted-foreground">{module.key}</Text>
                  {module.description && <Text size="sm" className="text-muted-foreground">{module.description}</Text>}
                </VStack>
                <HStack className="gap-2">
                  <Button size="sm" variant="outline" isDisabled={busy || module.key === 'authorization'} onPress={() => toggleModule(module)}><ButtonText>{module.isActive ? 'Disable' : 'Enable'}</ButtonText></Button>
                  <Button size="sm" variant="outline" onPress={() => addPermission(module)}><ButtonText>Add permission</ButtonText></Button>
                </HStack>
              </HStack>
              <Divider className="my-4" />
              <HStack className="flex-wrap gap-2">
                {(module.permissions ?? []).map((permission) => <Badge key={permission.id} variant="outline"><BadgeText>{module.key}:{permission.action}</BadgeText></Badge>)}
                {!module.permissions?.length && <Text size="sm" className="text-muted-foreground">No permissions configured.</Text>}
              </HStack>
            </Card>
          ))}
        </VStack>
      ) : (
        <VStack space="md">
          <Card variant="outline" className="p-5">
            <VStack space="xs"><Heading size="md">Role permissions</Heading><Text size="sm" className="text-muted-foreground">Changes replace the role's complete permission set and clear the server-side authorization cache.</Text></VStack>
          </Card>
          {roles.map((role) => {
            const selected = new Set((role.permissions ?? []).map((item) => item.permissionId ?? item.permission?.id))
            return <Card key={role.id} variant="outline" className="p-5"><VStack space="md">
              <HStack className="items-center justify-between"><VStack space="xs"><Heading size="md">{role.name}</Heading><Text size="sm" className="text-muted-foreground">{role.key ?? 'Role'}</Text></VStack><Badge variant="outline"><BadgeText>{selected.size} permissions</BadgeText></Badge></HStack>
              <VStack space="sm">{allPermissions.map((permission) => <HStack key={permission.id} className="items-center justify-between rounded-lg border border-outline-100 px-3 py-2"><VStack space="none"><Text size="sm" bold>{permission.module.key}:{permission.action}</Text><Text size="2xs" className="text-muted-foreground">{permission.module.name}</Text></VStack><Button size="xs" variant={selected.has(permission.id) ? 'solid' : 'outline'} isDisabled={busy} onPress={() => { const next = new Set(selected); next.has(permission.id) ? next.delete(permission.id) : next.add(permission.id); updateRole(role, [...next]) }}><ButtonText>{selected.has(permission.id) ? 'Granted' : 'Grant'}</ButtonText></Button></HStack>)}</VStack>
            </VStack></Card>
          })}
        </VStack>
      )}
    </VStack>
  )
}

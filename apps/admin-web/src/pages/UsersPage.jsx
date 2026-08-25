import { useCallback, useEffect, useMemo, useState } from 'react'
import { usersApi } from '../features/users/users.api'
import { authorizationApi } from '../features/authorization/authorization.api'
import { Box } from '../../components/ui/box'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Divider } from '../../components/ui/divider'
import { Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectItem } from '../../components/ui/select'
import { ChevronDownIcon } from '../../components/ui/icon'

const unwrap = (value) => value?.data ?? value

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [pendingRoles, setPendingRoles] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [busyUserId, setBusyUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [userResult, roleResult] = await Promise.all([
        usersApi.listUsers(),
        authorizationApi.listRoles(),
      ])
      setUsers(unwrap(userResult) ?? [])
      setRoles(unwrap(roleResult) ?? [])
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const roleById = useMemo(() => new Map(roles.map((role) => [String(role.id), role])), [roles])
  const selectedRoleId = selectedUser ? String(pendingRoles[selectedUser.id] ?? selectedUser.role?.id ?? '') : ''
  const selectedRole = roleById.get(selectedRoleId)

  const saveRole = async (user) => {
    const roleId = pendingRoles[user.id]
    if (!roleId || String(roleId) === String(user.role?.id ?? '')) return
    setBusyUserId(user.id)
    setError(null)
    setSaved(null)
    try {
      const result = await usersApi.assignRole(user.id, roleId)
      const updated = unwrap(result)
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...updated } : item))
      setPendingRoles((current) => { const next = { ...current }; delete next[user.id]; return next })
      setSelectedUser((current) => current?.id === user.id ? { ...current, ...updated } : current)
      setSaved(user.id)
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <VStack space="lg" className="mx-auto w-full max-w-7xl">
      <VStack space="xs">
        <Text size="sm" className="text-muted-foreground">Authorization</Text>
        <Heading size="xl">Users</Heading>
        <Text className="max-w-2xl text-muted-foreground">Assign users to roles. Permissions are inherited from the selected role and enforced by the server.</Text>
      </VStack>

      {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">{error}</Text></Card>}
      {loading ? <Card variant="outline" className="p-6"><Text className="text-muted-foreground">Loading users…</Text></Card> : (
        <HStack className="items-start gap-6 lg:flex-row">
          <Card variant="outline" className="min-w-0 flex-1 p-0">
            <VStack>
              <HStack className="items-center justify-between px-5 py-4"><VStack space="none"><Heading size="md">Users</Heading><Text size="sm" className="text-muted-foreground">{users.length} users</Text></VStack></HStack>
              <Divider />
              {users.length === 0 ? <Text className="p-5 text-muted-foreground">No users found.</Text> : users.map((user) => {
                const roleId = String(pendingRoles[user.id] ?? user.role?.id ?? '')
                const changed = roleId !== String(user.role?.id ?? '')
                const isSelected = selectedUser?.id === user.id
                return <HStack key={user.id} className={`items-center gap-4 px-5 py-4 ${isSelected ? 'bg-background-50' : ''}`}>
                  <VStack space="none" className="min-w-0 flex-1">
                    <Text size="sm" bold className="truncate">{user.email}</Text>
                    <Text size="2xs" className="text-muted-foreground">{user.isActive ? 'Active' : 'Inactive'}</Text>
                  </VStack>
                  <Badge variant="outline" className="hidden sm:flex"><BadgeText>{user.role?.name ?? 'No role'}</BadgeText></Badge>
                  <Button size="sm" variant={isSelected ? 'solid' : 'outline'} onPress={() => setSelectedUser(user)}><ButtonText>{isSelected ? 'Selected' : 'Manage'}</ButtonText></Button>
                </HStack>
              })}
            </VStack>
          </Card>

          {selectedUser && <Card variant="outline" className="w-full p-5 lg:w-[380px] lg:shrink-0">
            <VStack space="lg">
              <VStack space="xs"><Text size="sm" className="text-muted-foreground">User</Text><Heading size="md" className="break-all">{selectedUser.email}</Heading></VStack>
              <VStack space="xs"><Text size="sm" bold>Role</Text><Select selectedValue={selectedRoleId} onValueChange={(value) => setPendingRoles((current) => ({ ...current, [selectedUser.id]: value }))}>
                <SelectTrigger><SelectInput placeholder="Select a role" /><SelectIcon as={ChevronDownIcon} className="mr-3" /></SelectTrigger>
                <SelectPortal><SelectBackdrop /><SelectContent>{roles.map((role) => <SelectItem key={role.id} label={role.name} value={String(role.id)} />)}</SelectContent></SelectPortal>
              </Select></VStack>
              <Divider />
              <VStack space="sm"><HStack className="items-center justify-between"><Text size="sm" bold>Effective permissions</Text><Badge variant="outline"><BadgeText>{selectedRole?.permissions?.length ?? 0}</BadgeText></Badge></HStack>
                {(selectedRole?.permissions ?? []).map((entry) => {
                  const permission = entry.permission ?? entry
                  const moduleKey = permission.module?.key ?? permission.resource ?? 'permission'
                  return <Text key={permission.id} size="sm" className="text-muted-foreground">{moduleKey}:{permission.action}</Text>
                })}
                {!selectedRole?.permissions?.length && <Text size="sm" className="text-muted-foreground">No permissions granted.</Text>}
              </VStack>
              <HStack className="justify-end gap-2"><Button variant="outline" onPress={() => setSelectedUser(null)}><ButtonText>Close</ButtonText></Button><Button isDisabled={!pendingRoles[selectedUser.id] || String(pendingRoles[selectedUser.id]) === String(selectedUser.role?.id ?? '') || busyUserId === selectedUser.id} onPress={() => saveRole(selectedUser)}><ButtonText>{busyUserId === selectedUser.id ? 'Saving…' : 'Save role'}</ButtonText></Button></HStack>
              {saved === selectedUser.id && <Text size="sm" className="text-success-700">Role updated successfully.</Text>}
            </VStack>
          </Card>}
        </HStack>
      )}
    </VStack>
  )
}

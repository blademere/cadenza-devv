import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionIcon, Avatar, Box, Burger, Group, Kbd, Menu, Paper, Stack, Text, TextInput, ThemeIcon } from '@mantine/core'
import { MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react'
import { branding } from '../../config/branding'

const flattenNavigation = (navigation = []) => navigation.flatMap((section) =>
  (section.items || []).map((item) => ({
    ...item,
    sectionName: section.name,
  })),
)

export default function TopBar({ onMenu, user, role, navigation = [], onNavigate, sidebarCollapsed, onToggleSidebar }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchOpened, setSearchOpened] = useState(false)
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const items = useMemo(() => flattenNavigation(navigation), [navigation])
  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return items.slice(0, 6)
    return items.filter((item) => `${item.name} ${item.sectionName}`.toLowerCase().includes(value)).slice(0, 8)
  }, [items, query])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpened(true)
      }
      if (event.key === 'Escape') setSearchOpened(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const goTo = (route) => {
    setQuery('')
    setSearchOpened(false)
    navigate(route)
    onNavigate?.()
  }

  return (
    <Group h="100%" px={{ base: 'md', md: 'xl' }} gap="md" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Burger hiddenFrom="lg" onClick={onMenu} aria-label="Open navigation" size="sm" />
        <ActionIcon visibleFrom="lg" variant="subtle" color="gray" size="md" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <SidebarSimple size={20} />
        </ActionIcon>
        <Box visibleFrom="lg" style={{ minWidth: 145 }}>
          <Text size="sm" fw={650} truncate>{branding.workspaceName}</Text>
          <Text size="xs" c="dimmed" truncate>{branding.workspaceDescription}</Text>
        </Box>

        <Box pos="relative" style={{ flex: 1, maxWidth: 560 }}>
          <TextInput
            value={query}
            onChange={(event) => { setQuery(event.currentTarget.value); setSearchOpened(true) }}
            onFocus={() => setSearchOpened(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.currentTarget.blur(); setSearchOpened(false) }
              if (event.key === 'Enter' && results[0]) goTo(results[0].route)
            }}
            leftSection={<MagnifyingGlass size={17} />}
            rightSection={<Kbd size="xs">⌘ K</Kbd>}
            placeholder="Search workspace"
            size="sm"
            radius="md"
            aria-label="Search workspace"
          />
          {searchOpened && (
            <Paper pos="absolute" top="calc(100% + 8px)" left={0} right={0} p={6} shadow="md" radius="md" withBorder style={{ zIndex: 300 }}>
              <Stack gap={2}>
                {results.length ? results.map((item) => {
                  const Icon = item.icon
                  return (
                    <Menu.Item key={item.key || item.route} onClick={() => goTo(item.route)} leftSection={Icon ? <Icon size={18} /> : null}>
                      <Box><Text size="sm">{item.name}</Text><Text size="xs" c="dimmed">{item.sectionName}</Text></Box>
                    </Menu.Item>
                  )
                }) : <Text size="sm" c="dimmed" px="sm" py="md">No workspace pages found.</Text>}
              </Stack>
            </Paper>
          )}
        </Box>
      </Group>

      <Group gap="sm" wrap="nowrap">
        <Box ta="right" visibleFrom="sm">
          <Text size="sm" fw={600} truncate>{displayName}</Text>
          <Text size="xs" c="dimmed" truncate>{role || 'User'}</Text>
        </Box>
        <ThemeIcon variant="light" color="indigo" radius="xl" size={36} visibleFrom="md"><Text size="xs" fw={700}>{displayName.slice(0, 1).toUpperCase()}</Text></ThemeIcon>
        <Avatar size={34} radius="xl" color="indigo" hiddenFrom="md">{displayName.slice(0, 1).toUpperCase()}</Avatar>
      </Group>
    </Group>
  )
}

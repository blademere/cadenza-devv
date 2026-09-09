import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ActionIcon, Box, Breadcrumbs, Burger, Group, Kbd, Paper, Stack, Text, TextInput, ThemeIcon, UnstyledButton } from '@mantine/core'
import { CaretRight, MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react'

const flattenNavigation = (navigation = []) => navigation.flatMap((section) =>
  (section.items || []).map((item) => ({ ...item, sectionName: section.name })),
)

export default function TopBar({ onMenu, navigation = [], onNavigate, sidebarCollapsed, onToggleSidebar }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [searchOpened, setSearchOpened] = useState(false)
  const items = useMemo(() => flattenNavigation(navigation), [navigation])
  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return items.slice(0, 6)
    return items.filter((item) => `${item.name} ${item.sectionName}`.toLowerCase().includes(value)).slice(0, 8)
  }, [items, query])

  const current = useMemo(() => {
    const matches = items.filter((item) => location.pathname === item.route || (item.route !== '/' && location.pathname.startsWith(`${item.route}/`)))
    return matches.sort((a, b) => b.route.length - a.route.length)[0] ?? null
  }, [items, location.pathname])

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
    <Group h="100%" px={{ base: 'sm', sm: 'md', lg: 'xl' }} gap="sm" wrap="nowrap">
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon hiddenFrom="lg" variant="subtle" color="gray" size="lg" onClick={onMenu} aria-label="Open navigation">
          <Burger opened={false} size="sm" aria-hidden />
        </ActionIcon>
        <ActionIcon visibleFrom="lg" variant="subtle" color="gray" size="lg" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <SidebarSimple size={20} />
        </ActionIcon>
        <Box visibleFrom="sm" style={{ minWidth: 0, maxWidth: 360 }}>
          <Breadcrumbs separator={<CaretRight size={13} aria-hidden />} separatorMargin="xs">
            <Text size="xs" c="dimmed" truncate>Workspace</Text>
            {current?.sectionName && current.sectionName !== 'Workspace' && <Text size="xs" c="dimmed" truncate>{current.sectionName}</Text>}
            {current && <Text size="xs" fw={600} truncate>{current.name}</Text>}
          </Breadcrumbs>
        </Box>
      </Group>

      <Box pos="relative" style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <Box w="100%" maw={560}>
          <TextInput
            value={query}
            onChange={(event) => { setQuery(event.currentTarget.value); setSearchOpened(true) }}
            onFocus={() => setSearchOpened(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.currentTarget.blur(); setSearchOpened(false) }
              if (event.key === 'Enter' && results[0]) goTo(results[0].route)
            }}
            leftSection={<MagnifyingGlass size={17} />}
            rightSection={<Kbd size="xs" visibleFrom="sm">Ctrl K</Kbd>}
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
                    <UnstyledButton key={item.key || item.route} onClick={() => goTo(item.route)} className="obo-search-result" p="xs" w="100%">
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon variant="light" color="indigo" size={32} radius="md">
                          {Icon ? <Icon size={17} /> : <MagnifyingGlass size={17} />}
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={550} truncate>{item.name}</Text>
                          <Text size="xs" c="dimmed" truncate>{item.sectionName}</Text>
                        </Box>
                      </Group>
                    </UnstyledButton>
                  )
                }) : <Text size="sm" c="dimmed" px="sm" py="md">No workspace pages found.</Text>}
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>
    </Group>
  )
}

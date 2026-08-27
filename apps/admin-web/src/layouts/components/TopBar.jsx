import { Burger, Badge, Group, Text } from '@mantine/core'

export default function TopBar({ onMenu }) {
  return <Group h="100%" px="md" justify="space-between"><Group gap="sm"><Burger onClick={onMenu} aria-label="Open navigation" hiddenFrom="lg" /><Text fw={700}>Admin Console</Text></Group><Badge color="green" variant="light">Authorized</Badge></Group>
}

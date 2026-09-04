import { Center, Stack, Text, Title } from '@mantine/core'

export default function RoutePlaceholder({ title }) {
  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs">
        <Title order={2}>{title}</Title>
        <Text c="dimmed">This OBO workspace route is reserved for its domain implementation.</Text>
      </Stack>
    </Center>
  )
}

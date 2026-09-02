import { Card, Group, Stack, Text } from '@mantine/core'

export default function StatCard({ label, value, icon, helper }) {
  return (
    <Card withBorder>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text fz="h2" fw={700}>
            {value}
          </Text>
          {helper && <Text size="xs" c="dimmed">{helper}</Text>}
        </Stack>
        {icon && (
          <Group w={40} h={40} justify="center" bg="gray.0" c="blue" style={{ borderRadius: 8 }}>
            {icon}
          </Group>
        )}
      </Group>
    </Card>
  )
}

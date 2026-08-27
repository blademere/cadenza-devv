import { Center, Stack, Text } from '@mantine/core'

export default function EmptyState({ title = 'Nothing here yet', description, action }) { return <Center py={70}><Stack align="center" gap="xs"><Text fw={600} size="lg">{title}</Text>{description && <Text size="sm" c="dimmed" ta="center" maw={520}>{description}</Text>}{action && <Box pt="xs">{action}</Box>}</Stack></Center> }

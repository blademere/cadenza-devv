import { Box, Group, Stack, Text } from '@mantine/core'

export default function PageHeader({ eyebrow, title, description, actions }) {
  return <Box component="header" mb="md"><Group align="center" justify="space-between" gap="md" wrap="wrap"><Box style={{ minWidth: 0 }}>{eyebrow && <Text size="xs" fw={700} tt="uppercase" c="blue" lts="0.09em">{eyebrow}</Text>}<Text component="h1" fz={{ base: 'h2', sm: 'h1' }} fw={700} mt={eyebrow ? 4 : 0} mb={0}>{title}</Text>{description && <Text c="dimmed" mt={6} maw={760}>{description}</Text>}</Box>{actions && <Box>{actions}</Box>}</Group></Box>
}

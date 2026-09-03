import { Box, Skeleton, Stack } from '@mantine/core'

export default function LoadingState({ label = 'Loading…', rows = 4 }) {
  return (
    <Stack p={{ base: 'md', md: 'lg' }} gap="md" aria-label={label} role="status">
      <Skeleton height={14} width="32%" radius="xl" />
      <Skeleton height={10} width="54%" radius="xl" />
      <Box mt="xs">
        <Stack gap="sm">
          {Array.from({ length: rows }, (_, index) => <Skeleton key={index} height={44} radius="md" />)}
        </Stack>
      </Box>
    </Stack>
  )
}

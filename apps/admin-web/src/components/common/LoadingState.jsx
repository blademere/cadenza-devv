import { Center, Loader, Stack, Text } from '@mantine/core'

export default function LoadingState({ label = 'Loading…' }) { return <Center py={70}><Stack align="center" gap="sm"><Loader size="sm" /><Text size="sm" c="dimmed">{label}</Text></Stack></Center> }

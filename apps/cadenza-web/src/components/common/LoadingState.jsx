import { Skeleton, Stack } from '@mantine/core'
export default function LoadingState({label='Loading…',rows=4}){return <Stack p="lg" gap="md" aria-label={label} role="status"><Skeleton height={14} width="32%"/><Skeleton height={10} width="54%"/>{Array.from({length:rows},(_,i)=><Skeleton key={i} height={44}/>)}</Stack>}

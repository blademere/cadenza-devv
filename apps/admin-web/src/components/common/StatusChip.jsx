import { Badge } from '@mantine/core'

const colorFor = (status) => { const value = String(status ?? '').toLowerCase(); if (['active','approved','verified','success','granted'].includes(value)) return 'green'; if (['pending','review','warning'].includes(value)) return 'yellow'; if (['rejected','declined','failed','error','revoked'].includes(value)) return 'red'; return 'gray' }
export default function StatusChip({ status, label }) { return <Badge size="sm" variant="light" color={colorFor(status)}>{label ?? status ?? '—'}</Badge> }

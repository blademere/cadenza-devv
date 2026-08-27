import { Chip } from '@mui/material'

const colorFor = (status) => { const value = String(status ?? '').toLowerCase(); if (['active','approved','verified','success','granted'].includes(value)) return 'success'; if (['pending','review','warning'].includes(value)) return 'warning'; if (['rejected','declined','failed','error','revoked'].includes(value)) return 'error'; return 'default' }
export default function StatusChip({ status, label }) { return <Chip size="small" variant="outlined" color={colorFor(status)} label={label ?? status ?? '—'} /> }

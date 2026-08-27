import { useEffect, useState } from 'react'
import { apiClient } from '../services/api/client'
import { Alert, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'

export default function PermitTypesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => { let active = true; apiClient.get('/obo/permit-types').then((response) => { if (active) setItems(response?.data ?? response ?? []) }).catch((nextError) => { if (active) setError(nextError.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  return <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto' }}>
    <Stack spacing={0.5}><Typography variant="body2" color="text.secondary">Plan Permit configuration</Typography><Typography variant="h3">Permit Types</Typography><Typography color="text.secondary">Available permit application types exposed by the server.</Typography></Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <Card variant="outlined"><CardContent sx={{ p: 0 }}>
      {loading ? <Stack alignItems="center" spacing={1} sx={{ p: 6 }}><CircularProgress size={28} /><Typography color="text.secondary">Loading permit types…</Typography></Stack> : items.length ? items.map((item) => <Stack key={item.id ?? item.key} spacing={0.75} sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}><Chip label={item.key ?? item.code ?? 'Permit type'} size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} /><Typography variant="h6">{item.name}</Typography>{item.description && <Typography variant="body2" color="text.secondary">{item.description}</Typography>}</Stack>) : <Typography sx={{ p: 2.5 }} color="text.secondary">No permit types returned.</Typography>}
    </CardContent></Card>
  </Stack>
}

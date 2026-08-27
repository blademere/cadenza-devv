import { useEffect, useState } from 'react'
import { apiClient } from '../services/api/client'
import { Alert, Card, Chip, CircularProgress, Stack, Typography } from '@mui/material'

export default function ProfessionalsPage() {
  const [verified, setVerified] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null)
  useEffect(() => { let active = true; apiClient.get('/obo/professionals/verified').then((response) => { if (active) setVerified(response?.data ?? response ?? []) }).catch((e) => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  return <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto' }}>
    <Stack spacing={0.5}><Typography variant="body2" color="text.secondary">Professional registry</Typography><Typography variant="h3">Professionals</Typography><Typography color="text.secondary">Verified professionals available for association with permit applications.</Typography></Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <Card variant="outlined">{loading ? <Stack alignItems="center" spacing={1} sx={{ p: 6 }}><CircularProgress size={28} /><Typography color="text.secondary">Loading professionals…</Typography></Stack> : verified.length ? verified.map((professional) => <Stack key={professional.id} direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}><Stack><Typography variant="body2" fontWeight={700}>{professional.name ?? professional.user?.name ?? 'Professional'}</Typography><Typography variant="caption" color="text.secondary">{professional.registrationNumber ?? professional.prcId ?? 'Registration unavailable'}</Typography></Stack><Chip label="Verified" color="success" variant="outlined" size="small" /></Stack>) : <Typography sx={{ p: 2.5 }} color="text.secondary">No verified professionals returned.</Typography>}</Card>
  </Stack>
}

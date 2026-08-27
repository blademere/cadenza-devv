import { useCallback, useEffect, useState } from 'react'
import { workflowApi } from '../features/workflow/workflow.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Alert, Button, Card, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material'

export default function VerificationPage() {
  const { can } = useAuthorization()
  const [professionals, setProfessionals] = useState([]); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState(null); const [error, setError] = useState(null); const [reasons, setReasons] = useState({})
  const load = useCallback(async () => { setLoading(true); setError(null); try { setProfessionals(await workflowApi.listPendingProfessionals()) } catch (e) { setError(e.message) } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const decide = async (id, decision) => { if (decision === 'DECLINED' && !reasons[id]?.trim()) { setError('A reason is required when declining a verification application.'); return }; setBusyId(id); try { await workflowApi.decideProfessional(id, decision, reasons[id]); await load() } catch (e) { setError(e.message) } finally { setBusyId(null) } }
  if (!can('obo_professionals:review')) return <Card variant="outlined" sx={{ p: 3 }}><Typography variant="h6">Access restricted</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Your role does not have permission to review professional verification.</Typography></Card>
  return <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto' }}>
    <Stack spacing={0.5}><Typography variant="body2" color="text.secondary">Professional workflow</Typography><Typography variant="h3">Professional Verification</Typography><Typography color="text.secondary">Review PRC, PTR, and registration submissions before professionals can be associated with permits.</Typography></Stack>
    {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
    <Card variant="outlined">{loading ? <Stack alignItems="center" spacing={1} sx={{ p: 6 }}><CircularProgress size={28} /><Typography color="text.secondary">Loading verification queue…</Typography></Stack> : professionals.length === 0 ? <Stack alignItems="center" spacing={1} sx={{ p: 6 }}><Typography variant="h6">Queue is clear</Typography><Typography color="text.secondary">No professional verification applications are waiting for review.</Typography></Stack> : professionals.map((professional) => { const id = professional.id; return <Stack key={id} spacing={2} sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Stack><Typography variant="h6">{professional.name ?? professional.user?.name ?? 'Professional'}</Typography><Typography variant="body2" color="text.secondary">{professional.registrationNumber ?? 'Registration number unavailable'}</Typography></Stack><Chip label="Pending review" color="warning" variant="outlined" size="small" /></Stack>
      <Stack direction="row" spacing={5}><Stack><Typography variant="caption" color="text.secondary">PRC ID</Typography><Typography variant="body2" fontWeight={700}>{professional.prcId ?? '—'}</Typography></Stack><Stack><Typography variant="caption" color="text.secondary">PTR</Typography><Typography variant="body2" fontWeight={700}>{professional.ptrNumber ?? '—'}</Typography></Stack></Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-end' }}><TextField fullWidth size="small" label="Reason for decline" placeholder="Required when declining" value={reasons[id] ?? ''} onChange={(e) => setReasons((current) => ({ ...current, [id]: e.target.value }))} /><Stack direction="row" spacing={1}><Button size="small" variant="outlined" disabled={busyId === id} onClick={() => void decide(id, 'DECLINED')}>Decline</Button><Button size="small" variant="contained" disabled={busyId === id} onClick={() => void decide(id, 'ACCEPTED')}>Approve verification</Button></Stack></Stack>
    </Stack>})}</Card>
  </Stack>
}

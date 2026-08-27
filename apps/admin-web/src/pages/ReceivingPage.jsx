import { useCallback, useEffect, useState } from 'react'
import { workflowApi } from '../features/workflow/workflow.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Alert, Box, Button, Card, Chip, CircularProgress, Divider, Stack, TextField, Typography } from '@mui/material'

export default function ReceivingPage() {
  const { can } = useAuthorization()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [reasons, setReasons] = useState({})

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { const result = await workflowApi.listReceiving(); setApplications(Array.isArray(result) ? result : result?.applications ?? []) }
    catch (nextError) { setError(nextError.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const receive = async (id) => { setBusyId(id); try { await workflowApi.receiveApplication(id); await load() } catch (e) { setError(e.message) } finally { setBusyId(null) } }
  const decide = async (id, decision) => {
    if (decision === 'DECLINED' && !reasons[id]?.trim()) { setError('A reason is required when declining an application.'); return }
    setBusyId(id); try { await workflowApi.decideApplication(id, decision, reasons[id]); await load() } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  if (!can('obo_plan_permits:receive')) return <Card variant="outlined" sx={{ p: 3 }}><Typography variant="h6">Access restricted</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Your role does not have permission to receive permit applications.</Typography></Card>

  return <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto' }}>
    <Box><Typography variant="body2" color="text.secondary">Plan Permit workflow</Typography><Typography variant="h3" sx={{ mt: .5 }}>Receiving</Typography><Typography color="text.secondary" sx={{ mt: 1, maxWidth: 850 }}>Receive the scheduled hard copy first, then record the receiving decision. Accepted applications proceed to inspection; declined applications end this phase.</Typography></Box>
    {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      {loading ? <Stack alignItems="center" spacing={1} sx={{ p: 6 }}><CircularProgress size={28} /><Typography color="text.secondary">Loading receiving queue…</Typography></Stack> : applications.length === 0 ? <Stack alignItems="center" spacing={1} sx={{ p: 6 }}><Typography variant="h6">Queue is clear</Typography><Typography color="text.secondary">No permit applications are currently in the receiving queue.</Typography></Stack> : applications.map((application) => {
        const id = application.id; const status = application.status ?? 'SUBMISSION_SCHEDULED'; const scheduled = status === 'SUBMISSION_SCHEDULED'
        return <Stack key={id} spacing={2} sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
            <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={700}>{application.referenceNumber ?? id}</Typography><Typography variant="caption" color="text.secondary">{application.permitType?.name ?? application.permitType ?? 'Plan Permit'}</Typography></Box>
            <Box sx={{ flex: 1 }}><Typography variant="body2">{application.applicant?.name ?? application.user?.name ?? 'Applicant'}</Typography><Typography variant="caption" color="text.secondary">{application.submissionAppointment?.date ?? application.appointment?.date ?? 'Submission appointment'}</Typography></Box>
            <Chip label={status} color={scheduled ? 'warning' : 'info'} variant="outlined" size="small" />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {scheduled ? <Button size="small" variant="outlined" disabled={busyId === id} onClick={() => void receive(id)}>Receive hard copy</Button> : <><Button size="small" variant="contained" disabled={busyId === id} onClick={() => void decide(id, 'ACCEPTED')}>Accept → inspection</Button><Button size="small" variant="outlined" disabled={busyId === id} onClick={() => void decide(id, 'DECLINED')}>Decline</Button></>}
            </Stack>
          </Stack>
          {!scheduled && <TextField fullWidth size="small" label="Reason for decline" placeholder="Required when declining" value={reasons[id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [id]: event.target.value }))} />}
        </Stack>
      })}
    </Card>
  </Stack>
}

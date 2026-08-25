import { useCallback, useEffect, useState } from 'react'
import { workflowApi } from '../features/workflow/workflow.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Input, InputField } from '../../components/ui/input'

export default function VerificationPage() {
  const { can } = useAuthorization()
  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [reasons, setReasons] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setProfessionals(await workflowApi.listPendingProfessionals()) }
    catch (nextError) { setError(nextError.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (id, decision) => {
    if (decision === 'DECLINED' && !reasons[id]?.trim()) { setError('A reason is required when declining a verification application.'); return }
    setBusyId(id)
    try { await workflowApi.decideProfessional(id, decision, reasons[id]); await load() }
    catch (nextError) { setError(nextError.message) }
    finally { setBusyId(null) }
  }

  if (!can('obo_professionals:review')) return <Card variant="outline" className="p-6"><Heading size="md">Access restricted</Heading><Text className="mt-2 text-muted-foreground">Your role does not have permission to review professional verification.</Text></Card>

  return <VStack space="lg" className="mx-auto w-full max-w-7xl">
    <VStack space="xs"><Text size="sm" className="text-muted-foreground">Professional workflow</Text><Heading size="xl">Professional Verification</Heading><Text className="text-muted-foreground">Review PRC, PTR, and registration submissions before professionals can be associated with permits.</Text></VStack>
    {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">{error}</Text></Card>}
    <Card variant="outline" className="overflow-hidden p-0">
      {loading ? <Text className="p-5 text-muted-foreground">Loading verification queue…</Text> : professionals.length === 0 ? <VStack className="items-center p-10" space="xs"><Heading size="md">Queue is clear</Heading><Text className="text-muted-foreground">No professional verification applications are waiting for review.</Text></VStack> : professionals.map((professional) => {
        const id = professional.id
        return <VStack key={id} space="md" className="border-b border-outline-100 p-5 last:border-b-0">
          <HStack className="items-start justify-between gap-4"><VStack space="none"><Heading size="md">{professional.name ?? professional.user?.name ?? 'Professional'}</Heading><Text size="sm" className="text-muted-foreground">{professional.registrationNumber ?? 'Registration number unavailable'}</Text></VStack><Badge action="warning" variant="outline"><BadgeText>Pending review</BadgeText></Badge></HStack>
          <HStack className="flex-wrap gap-6"><VStack space="none"><Text size="2xs" className="text-muted-foreground">PRC ID</Text><Text size="sm" bold>{professional.prcId ?? '—'}</Text></VStack><VStack space="none"><Text size="2xs" className="text-muted-foreground">PTR</Text><Text size="sm" bold>{professional.ptrNumber ?? '—'}</Text></VStack></HStack>
          <HStack className="flex-wrap items-end justify-between gap-3"><Input className="min-w-[260px] flex-1"><InputField placeholder="Reason for decline (required when declining)" value={reasons[id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [id]: value }))} /></Input><HStack className="gap-2"><Button size="sm" variant="outline" isDisabled={busyId === id} onPress={() => decide(id, 'DECLINED')}><ButtonText>Decline</ButtonText></Button><Button size="sm" isDisabled={busyId === id} onPress={() => decide(id, 'ACCEPTED')}><ButtonText>Approve verification</ButtonText></Button></HStack></HStack>
        </VStack>
      })}
    </Card>
  </VStack>
}

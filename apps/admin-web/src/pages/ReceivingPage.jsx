import { useCallback, useEffect, useState } from 'react'
import { workflowApi } from '../features/workflow/workflow.api'
import { useAuthorization } from '../features/authorization/AuthorizationProvider'
import { Box } from '../../components/ui/box'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Input, InputField } from '../../components/ui/input'

export default function ReceivingPage() {
  const { can } = useAuthorization()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [reasons, setReasons] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setApplications(await workflowApi.listReceiving('SUBMISSION_SCHEDULED')) }
    catch (nextError) { setError(nextError.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const receive = async (id) => {
    setBusyId(id)
    try { await workflowApi.receiveApplication(id); await load() }
    catch (nextError) { setError(nextError.message) }
    finally { setBusyId(null) }
  }

  const decide = async (id, decision) => {
    if (decision === 'DECLINED' && !reasons[id]?.trim()) { setError('A reason is required when declining an application.'); return }
    setBusyId(id)
    try { await workflowApi.decideApplication(id, decision, reasons[id]); await load() }
    catch (nextError) { setError(nextError.message) }
    finally { setBusyId(null) }
  }

  if (!can('obo_plan_permits:receive')) return <Card variant="outline" className="p-6"><Heading size="md">Access restricted</Heading><Text className="mt-2 text-muted-foreground">Your role does not have permission to receive permit applications.</Text></Card>

  return <VStack space="lg" className="mx-auto w-full max-w-7xl">
    <VStack space="xs"><Text size="sm" className="text-muted-foreground">Plan Permit workflow</Text><Heading size="xl">Receiving</Heading><Text className="text-muted-foreground">Review scheduled submissions, receive hard-copy documents, and record the receiving decision.</Text></VStack>
    {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">{error}</Text></Card>}
    <Card variant="outline" className="overflow-hidden p-0">
      <HStack className="hidden border-b border-outline-100 px-5 py-3 md:flex"><Text className="w-[26%] text-xs font-semibold uppercase text-muted-foreground">Application</Text><Text className="w-[24%] text-xs font-semibold uppercase text-muted-foreground">Applicant</Text><Text className="w-[20%] text-xs font-semibold uppercase text-muted-foreground">Status</Text><Text className="flex-1 text-xs font-semibold uppercase text-muted-foreground">Action</Text></HStack>
      {loading ? <Text className="p-5 text-muted-foreground">Loading scheduled submissions…</Text> : applications.length === 0 ? <VStack className="items-center p-10" space="xs"><Heading size="md">Queue is clear</Heading><Text className="text-muted-foreground">No scheduled submissions are waiting for receiving review.</Text></VStack> : applications.map((application) => {
        const id = application.id
        return <VStack key={id} className="gap-3 border-b border-outline-100 p-5 last:border-b-0 md:flex-row md:items-center">
          <VStack className="md:w-[26%]" space="none"><Text size="sm" bold>{application.referenceNumber ?? id}</Text><Text size="2xs" className="text-muted-foreground">{application.permitType?.name ?? application.permitType ?? 'Plan Permit'}</Text></VStack>
          <VStack className="md:w-[24%]" space="none"><Text size="sm">{application.applicant?.name ?? application.user?.name ?? 'Applicant'}</Text><Text size="2xs" className="text-muted-foreground">{application.appointment?.date ?? 'Scheduled submission'}</Text></VStack>
          <Box className="md:w-[20%]"><Badge action="warning" variant="outline"><BadgeText>{application.status ?? 'SUBMISSION_SCHEDULED'}</BadgeText></Badge></Box>
          <VStack className="flex-1 gap-2 md:items-end">
            <HStack className="flex-wrap gap-2"><Button size="sm" variant="outline" isDisabled={busyId === id} onPress={() => receive(id)}><ButtonText>Receive hard copy</ButtonText></Button><Button size="sm" isDisabled={busyId === id} onPress={() => decide(id, 'ACCEPTED')}><ButtonText>Accept</ButtonText></Button><Button size="sm" variant="outline" isDisabled={busyId === id} onPress={() => decide(id, 'DECLINED')}><ButtonText>Decline</ButtonText></Button></HStack>
            <Input className="w-full md:max-w-[320px]"><InputField placeholder="Reason for decline (if needed)" value={reasons[id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [id]: value }))} /></Input>
          </VStack>
        </VStack>
      })}
    </Card>
  </VStack>
}

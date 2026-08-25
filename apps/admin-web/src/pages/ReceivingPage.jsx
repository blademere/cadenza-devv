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
    try {
      const result = await workflowApi.listReceiving()
      setApplications(Array.isArray(result) ? result : result?.applications ?? [])
    } catch (nextError) { setError(nextError.message) }
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
    <VStack space="xs"><Text size="sm" className="text-muted-foreground">Plan Permit workflow</Text><Heading size="xl">Receiving</Heading><Text className="text-muted-foreground">Receive the scheduled hard copy first, then record the receiving decision. Accepted applications proceed to inspection; declined applications end this phase.</Text></VStack>
    {error && <Card variant="outline" className="border-error-300 bg-error-50 p-4"><Text className="text-error-700">{error}</Text></Card>}
    <Card variant="outline" className="overflow-hidden p-0">
      <HStack className="hidden border-b border-outline-100 px-5 py-3 md:flex"><Text className="w-[25%] text-xs font-semibold uppercase text-muted-foreground">Application</Text><Text className="w-[22%] text-xs font-semibold uppercase text-muted-foreground">Applicant</Text><Text className="w-[18%] text-xs font-semibold uppercase text-muted-foreground">Workflow state</Text><Text className="flex-1 text-xs font-semibold uppercase text-muted-foreground">Action</Text></HStack>
      {loading ? <Text className="p-5 text-muted-foreground">Loading receiving queue…</Text> : applications.length === 0 ? <VStack className="items-center p-10" space="xs"><Heading size="md">Queue is clear</Heading><Text className="text-muted-foreground">No permit applications are currently in the receiving queue.</Text></VStack> : applications.map((application) => {
        const id = application.id
        const status = application.status ?? 'SUBMISSION_SCHEDULED'
        const scheduled = status === 'SUBMISSION_SCHEDULED'
        return <VStack key={id} className="gap-3 border-b border-outline-100 p-5 last:border-b-0 md:flex-row md:items-center">
          <VStack className="md:w-[25%]" space="none"><Text size="sm" bold>{application.referenceNumber ?? id}</Text><Text size="2xs" className="text-muted-foreground">{application.permitType?.name ?? application.permitType ?? 'Plan Permit'}</Text></VStack>
          <VStack className="md:w-[22%]" space="none"><Text size="sm">{application.applicant?.name ?? application.user?.name ?? 'Applicant'}</Text><Text size="2xs" className="text-muted-foreground">{application.submissionAppointment?.date ?? application.appointment?.date ?? 'Submission appointment'}</Text></VStack>
          <Box className="md:w-[18%]"><Badge action={scheduled ? 'warning' : 'info'} variant="outline"><BadgeText>{status}</BadgeText></Badge></Box>
          <VStack className="flex-1 gap-2 md:items-end">
            <HStack className="flex-wrap gap-2">{scheduled ? <Button size="sm" variant="outline" isDisabled={busyId === id} onPress={() => receive(id)}><ButtonText>Receive hard copy</ButtonText></Button> : <><Button size="sm" isDisabled={busyId === id} onPress={() => decide(id, 'ACCEPTED')}><ButtonText>Accept → inspection</ButtonText></Button><Button size="sm" variant="outline" isDisabled={busyId === id} onPress={() => decide(id, 'DECLINED')}><ButtonText>Decline</ButtonText></Button></>}</HStack>
            {!scheduled && <Input className="w-full md:max-w-[320px]"><InputField placeholder="Reason for decline (if needed)" value={reasons[id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [id]: value }))} /></Input>}
          </VStack>
        </VStack>
      })}
    </Card>
  </VStack>
}

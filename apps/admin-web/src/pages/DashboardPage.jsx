import { useAuth } from '../features/auth/AuthProvider'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge, BadgeText } from '../../components/ui/badge'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'

const stats = [
  { label: 'Pending applications', value: '24', change: '+12%', note: 'vs. last week', action: 'warning' },
  { label: 'Appointments today', value: '8', change: '+3', note: 'scheduled visits', action: 'info' },
  { label: 'Verified professionals', value: '142', change: '+8', note: 'this month', action: 'success' },
  { label: 'For inspection', value: '17', change: '5 new', note: 'awaiting inspection', action: 'muted' },
]

const recent = [
  ['PP-2026-00421', 'Maria Santos', 'Building Permit', 'For Inspection', 'success'],
  ['PP-2026-00418', 'Juan Dela Cruz', 'Occupancy Permit', 'Appointment', 'info'],
  ['PP-2026-00416', 'Ana Reyes', 'Building Permit', 'For Review', 'warning'],
  ['PP-2026-00412', 'Pedro Garcia', 'Renovation Permit', 'Submitted', 'muted'],
]

export default function DashboardPage() {
  const { user } = useAuth()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'

  return <VStack space="xl" className="mx-auto w-full max-w-[1400px]">
    <HStack className="items-end justify-between gap-6"><VStack space="xs"><Badge size="sm" variant="outline" action="info" className="self-start"><BadgeText>OVERVIEW</BadgeText></Badge><Heading size="2xl" className="text-foreground md:text-3xl">Good morning, {name}.</Heading><Text size="sm" className="text-muted-foreground">Here’s what needs your attention today.</Text></VStack><Button className="hidden sm:flex"><ButtonText>+ New application</ButtonText></Button></HStack>
    <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => <Card key={item.label} size="lg" variant="elevated" className="admin-stat-card bg-card p-5"><VStack space="md"><HStack className="items-start justify-between gap-3"><Text size="sm" className="text-muted-foreground">{item.label}</Text><Badge size="sm" action={item.action === 'muted' ? 'info' : item.action} variant="outline"><BadgeText>{item.change}</BadgeText></Badge></HStack><Heading size="2xl" className="text-foreground">{item.value}</Heading><Text size="2xs" className="text-muted-foreground">{item.note}</Text></VStack></Card>)}</Box>
    <Box className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
      <Card size="lg" variant="elevated" className="overflow-hidden bg-card p-0"><VStack><HStack className="items-center justify-between border-b border-border px-5 py-4"><VStack space="none"><Heading size="md" className="text-foreground">Recent applications</Heading><Text size="2xs" className="text-muted-foreground">Latest permit activity</Text></VStack><Button variant="link" size="sm"><ButtonText>View all</ButtonText></Button></HStack><Box className="w-full overflow-x-auto"><Box className="min-w-[650px]"><HStack className="admin-table-head px-5 py-3"><Text size="2xs" bold className="w-[24%] text-muted-foreground">APPLICATION</Text><Text size="2xs" bold className="w-[22%] text-muted-foreground">APPLICANT</Text><Text size="2xs" bold className="w-[22%] text-muted-foreground">TYPE</Text><Text size="2xs" bold className="w-[20%] text-muted-foreground">STATUS</Text><Text size="2xs" bold className="w-[12%] text-right text-muted-foreground">ACTION</Text></HStack>{recent.map(([id, applicant, type, status, action]) => <HStack key={id} className="admin-table-row items-center px-5 py-4"><VStack space="none" className="w-[24%]"><Text size="sm" bold className="text-foreground">{id}</Text><Text size="2xs" className="text-muted-foreground">Aug 25, 2026</Text></VStack><Text size="sm" className="w-[22%] text-foreground">{applicant}</Text><Text size="sm" className="w-[22%] text-muted-foreground">{type}</Text><Box className="w-[20%]"><Badge size="sm" action={action === 'muted' ? 'info' : action} variant="outline"><BadgeText>{status}</BadgeText></Badge></Box><Button variant="link" size="sm" className="w-[12%]"><ButtonText>Open</ButtonText></Button></HStack>)}</Box></Box></VStack></Card>
      <VStack space="md"><Card size="lg" variant="elevated" className="bg-card p-5"><VStack space="md"><HStack className="items-center justify-between"><VStack space="none"><Heading size="md" className="text-foreground">Today</Heading><Text size="2xs" className="text-muted-foreground">Appointment capacity</Text></VStack><Text size="xl" bold className="text-foreground">8 / 12</Text></HStack><Box className="h-2 overflow-hidden rounded-full bg-muted"><Box className="h-full w-2/3 rounded-full bg-primary" /></Box><Text size="2xs" className="text-muted-foreground">4 appointment slots remaining</Text></VStack></Card><Card size="lg" variant="outline" className="bg-primary p-5"><VStack space="sm"><Text size="2xs" bold className="tracking-widest text-primary-foreground">QUICK ACTION</Text><Heading size="md" className="text-primary-foreground">Professional verification</Heading><Text size="sm" className="text-primary-foreground">6 professionals are waiting for document review.</Text><Button variant="link" size="sm" className="self-start"><ButtonText>Review queue →</ButtonText></Button></VStack></Card></VStack>
    </Box>
    <Box className="grid grid-cols-1 gap-4 md:grid-cols-3"><Card variant="outline" className="bg-card p-5"><VStack space="xs"><Text size="2xs" bold className="tracking-widest text-muted-foreground">APPLICATIONS</Text><Heading size="lg" className="text-foreground">Manage permits</Heading><Text size="sm" className="text-muted-foreground">Review submitted applications and move them through the permit workflow.</Text></VStack></Card><Card variant="outline" className="bg-card p-5"><VStack space="xs"><Text size="2xs" bold className="tracking-widest text-muted-foreground">APPOINTMENTS</Text><Heading size="lg" className="text-foreground">Control capacity</Heading><Text size="sm" className="text-muted-foreground">Configure availability and monitor daily appointment demand.</Text></VStack></Card><Card variant="outline" className="bg-card p-5"><VStack space="xs"><Text size="2xs" bold className="tracking-widest text-muted-foreground">PROFESSIONALS</Text><Heading size="lg" className="text-foreground">Verify credentials</Heading><Text size="sm" className="text-muted-foreground">Review PRC and PTR submissions before professionals join applications.</Text></VStack></Card></Box>
  </VStack>
}

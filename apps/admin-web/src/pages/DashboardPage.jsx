import { useAuth } from '../features/auth/AuthProvider'
import { Box } from '../../components/ui/box'
import { HStack } from '../../components/ui/hstack'
import { VStack } from '../../components/ui/vstack'
import { Button, ButtonText } from '../../components/ui/button'
import { Text } from '../../components/ui/text'
import { Heading } from '../../components/ui/heading'
import { Badge, BadgeText } from '../../components/ui/badge'

const stats = [
  ['Pending applications', '24', '+12% this week'],
  ['Appointments today', '8', '4 slots remaining'],
  ['Verified professionals', '142', '+8 this month'],
  ['For inspection', '17', '5 received today'],
]

const recent = [
  ['PP-2026-00421', 'Maria Santos', 'Building Permit', 'For Inspection', 'success'],
  ['PP-2026-00418', 'Juan Dela Cruz', 'Occupancy Permit', 'Appointment', 'info'],
  ['PP-2026-00416', 'Ana Reyes', 'Building Permit', 'For Review', 'warning'],
  ['PP-2026-00412', 'Pedro Garcia', 'Renovation Permit', 'Submitted', 'neutral'],
]

const statusClass = { success: 'admin-status-success', info: 'admin-status-info', warning: 'admin-status-warning', neutral: 'admin-status-neutral' }

export default function DashboardPage() {
  const { user } = useAuth()
  const name = user?.name || user?.email?.split('@')[0] || 'Administrator'

  return <VStack space="xl" className="admin-page admin-content">
    <Box className="admin-page-header"><VStack space="xs"><Text className="admin-eyebrow">Overview</Text><Heading className="admin-page-title">Good morning, {name}.</Heading><Text className="admin-page-subtitle">A concise view of today's operational work.</Text></VStack><Button size="sm" className="hidden sm:flex"><ButtonText>New application</ButtonText></Button></Box>

    <Box className="admin-kpi-grid">{stats.map(([label, value, meta]) => <Box key={label} className="admin-kpi"><Text className="admin-kpi-label">{label}</Text><Text className="admin-kpi-value">{value}</Text><Text className="admin-kpi-meta">{meta}</Text></Box>)}</Box>

    <Box className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Box className="admin-panel"><Box className="admin-panel-header"><VStack space="none"><Text className="admin-panel-title">Recent applications</Text><Text className="admin-panel-subtitle">Latest permit activity</Text></VStack><Button variant="link" size="sm"><ButtonText>View all</ButtonText></Button></Box><Box className="w-full overflow-x-auto"><table className="admin-table"><thead><tr><th>Application</th><th>Applicant</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>{recent.map(([id, applicant, type, status, tone]) => <tr key={id}><td><VStack space="none"><Text className="admin-id">{id}</Text><Text className="admin-muted">Aug 25, 2026</Text></VStack></td><td>{applicant}</td><td className="admin-muted">{type}</td><td><span className={`admin-status ${statusClass[tone]}`}>{status}</span></td><td><Button variant="link" size="sm"><ButtonText>Open</ButtonText></Button></td></tr>)}</tbody></table></Box></Box>
      <VStack space="3"><Box className="admin-panel"><Box className="admin-panel-header"><VStack space="none"><Text className="admin-panel-title">Today's capacity</Text><Text className="admin-panel-subtitle">Appointments</Text></VStack><Text className="text-foreground" bold>8 / 12</Text></Box><VStack space="sm" className="p-4"><Box className="admin-progress"><Box className="admin-progress-value w-2/3" /></Box><Text className="admin-muted">4 appointment slots remaining</Text></VStack></Box><Box className="admin-action-panel"><Text className="admin-action-title">Professional verification</Text><Text className="admin-action-text">6 professionals are waiting for PRC and PTR document review.</Text><a className="admin-action-link" href="/dashboard">Review queue →</a></Box></VStack>
    </Box>

    <Box className="admin-card-grid"><Box className="admin-info-card"><Text className="admin-info-label">Applications</Text><Text className="admin-info-title">Manage permits</Text><Text className="admin-info-text">Review submissions and move applications through the workflow.</Text></Box><Box className="admin-info-card"><Text className="admin-info-label">Appointments</Text><Text className="admin-info-title">Control capacity</Text><Text className="admin-info-text">Configure availability and monitor daily appointment demand.</Text></Box><Box className="admin-info-card"><Text className="admin-info-label">Professionals</Text><Text className="admin-info-title">Verify credentials</Text><Text className="admin-info-text">Review PRC and PTR submissions before association with permits.</Text></Box></Box>
  </VStack>
}

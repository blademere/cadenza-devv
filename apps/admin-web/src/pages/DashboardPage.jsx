import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Button, ButtonText } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Text } from '../../components/ui/text'
import './DashboardPage.css'

function getDisplayName(user) {
  return user?.name || user?.email?.split('@')[0] || 'there'
}

const overview = [
  {
    label: 'ACCOUNT STATUS',
    value: 'Authenticated',
    description: 'Your account is securely signed in and ready for the next action.',
    meta: 'Active session',
  },
  {
    label: 'ACCESS',
    value: 'Secure session',
    description: 'Authentication state is maintained by the application session flow.',
    meta: 'Protected workspace',
  },
  {
    label: 'NEXT',
    value: 'Workspace modules',
    description: 'Application modules, workflows, and administration tools will appear here.',
    meta: 'Ready to expand',
  },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const displayName = getDisplayName(user)

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <main className="workspace-page">
      <div className="workspace-shell">
        <header className="workspace-nav">
          <Link className="brand" to="/dashboard" aria-label="Express App dashboard">
            <span className="brand-mark">EA</span>
            <span className="brand-name">Express App Admin</span>
          </Link>

          <div className="workspace-nav-actions">
            <Text size="sm" className="workspace-user">
              {user?.email || 'Authenticated user'}
            </Text>
            <Button variant="outline" size="sm" onPress={handleLogout}>
              <ButtonText>Sign out</ButtonText>
            </Button>
          </div>
        </header>

        <section className="workspace-hero">
          <div>
            <span className="workspace-kicker">ADMIN WORKSPACE</span>
            <h1>Good to see you, {displayName}.</h1>
            <p>Manage the platform from one focused administrative workspace.</p>
          </div>
          <div className="workspace-status"><span /> All systems ready</div>
        </section>

        <section className="workspace-overview" aria-label="Workspace overview">
          {overview.map((item) => (
            <Card key={item.label} className="overview-card" size="default">
              <Text size="xs" bold className="overview-label">{item.label}</Text>
              <Text size="xl" bold className="overview-value">{item.value}</Text>
              <Text size="sm" className="overview-description">{item.description}</Text>
              <Text size="xs" className="overview-meta">{item.meta}</Text>
            </Card>
          ))}
        </section>

        <section className="workspace-next">
          <div className="next-heading">
            <span className="workspace-kicker">ADMINISTRATION</span>
            <h2>Build your operational workspace.</h2>
          </div>
          <Card className="next-card" size="default">
            <div className="next-icon">+</div>
            <div>
              <Text size="lg" bold>Platform modules</Text>
              <Text size="sm" className="next-description">
                Add users, professionals, permits, appointments, notifications, and other administrative workflows here.
              </Text>
            </div>
            <Button variant="ghost" size="icon" aria-label="Open modules">
              <ButtonText>→</ButtonText>
            </Button>
          </Card>
        </section>

        <footer className="workspace-footer">
          <Text size="xs">© Express App</Text>
          <Link to="/">Back to landing page</Link>
        </footer>
      </div>
    </main>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import './DashboardPage.css'

function getDisplayName(user) {
  return user?.name || user?.email?.split('@')[0] || 'there'
}

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
            <span className="brand-name">Express App</span>
          </Link>
          <div className="workspace-nav-actions">
            <span className="workspace-user">{user?.email || 'Authenticated user'}</span>
            <button type="button" className="workspace-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        <section className="workspace-hero">
          <div>
            <span className="workspace-kicker">YOUR WORKSPACE</span>
            <h1>Good to see you, {displayName}.</h1>
            <p>Your session is active. Start with the overview below and keep building from here.</p>
          </div>
          <div className="workspace-status"><span /> All systems ready</div>
        </section>

        <section className="workspace-overview" aria-label="Workspace overview">
          <article className="overview-card overview-card-primary">
            <span className="overview-label">ACCOUNT STATUS</span>
            <strong>Authenticated</strong>
            <p>Your account is securely signed in and ready for the next action.</p>
            <div className="overview-meta"><span className="meta-dot" /> Active session</div>
          </article>
          <article className="overview-card">
            <span className="overview-label">ACCESS</span>
            <strong>Secure session</strong>
            <p>Authentication state is maintained by the application's session flow.</p>
            <div className="overview-meta">Protected workspace</div>
          </article>
          <article className="overview-card">
            <span className="overview-label">NEXT</span>
            <strong>Workspace modules</strong>
            <p>This area is ready for the authenticated features that come next.</p>
            <div className="overview-meta">Ready to expand</div>
          </article>
        </section>

        <section className="workspace-next">
          <div className="next-heading"><span className="workspace-kicker">WHAT'S NEXT</span><h2>A focused place to continue.</h2></div>
          <div className="next-card">
            <div className="next-icon">+</div>
            <div><h3>Build your workspace</h3><p>Add application modules, activity, notifications, and personalized actions here without changing the authentication flow.</p></div>
            <span className="next-arrow">→</span>
          </div>
        </section>

        <footer className="workspace-footer">
          <span>© Express App</span>
          <Link to="/">Back to landing page</Link>
        </footer>
      </div>
    </main>
  )
}

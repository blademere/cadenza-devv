import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Express App</p>
            <h1>Dashboard</h1>
          </div>
          <span className="dashboard-user">{user?.email || 'Authenticated user'}</span>
        </header>

        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-kicker">Welcome back</p>
            <h2>{user?.email ? `Hello, ${user.email}` : 'Your workspace is ready.'}</h2>
            <p>You're signed in successfully. This dashboard is your starting point for authenticated features.</p>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Dashboard overview">
          <article className="dashboard-card">
            <span className="dashboard-card-label">Account</span>
            <strong>Authenticated</strong>
            <p>Your session is active and your account is ready to use.</p>
          </article>
          <article className="dashboard-card">
            <span className="dashboard-card-label">Access</span>
            <strong>Secure session</strong>
            <p>Authentication is handled through the application's secure session flow.</p>
          </article>
          <article className="dashboard-card">
            <span className="dashboard-card-label">Next</span>
            <strong>Workspace</strong>
            <p>Application modules and personalized features can be added here.</p>
          </article>
        </section>

        <nav className="dashboard-actions" aria-label="Dashboard actions">
          <Link className="dashboard-home-link" to="/">Home</Link>
          <button type="button" className="dashboard-signout" onClick={logout}>Sign out</button>
        </nav>
      </div>
    </main>
  )
}

import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import './HomePage.css'

const highlights = [
  ['01', 'One clear starting point', 'A focused workspace that keeps the important actions easy to find.'],
  ['02', 'Secure by design', 'Modern authentication with email, Google, and Facebook sign-in.'],
  ['03', 'Ready to grow', 'A clean foundation for the authenticated features you will add next.'],
]

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth()

  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="landing-nav">
          <Link className="brand" to="/" aria-label="Express App home">
            <span className="brand-mark" aria-hidden="true">EA</span>
            <span className="brand-name">Express App</span>
          </Link>

          <nav className="landing-links" aria-label="Landing page navigation">
            <a href="#features">Why Express App</a>
            <a href="#experience">Experience</a>
          </nav>

          {!isLoading && (
            isAuthenticated
              ? <Link className="nav-cta" to="/dashboard">Open dashboard</Link>
              : <Link className="nav-cta" to="/login">Sign in</Link>
          )}
        </header>

        <section className="landing-hero">
          <div className="landing-copy">
            <span className="landing-badge"><span /> A simpler way to get things done</span>
            <h1>From sign-in to workspace, <em>everything flows.</em></h1>
            <p>
              A polished application experience with a clear public entry point, fast authentication,
              and a focused dashboard that puts the next action in front of you.
            </p>
            <div className="landing-actions">
              <Link className="button button-primary" to={isAuthenticated ? '/dashboard' : '/login'}>
                {isAuthenticated ? 'Go to dashboard' : 'Get started'}
                <span aria-hidden="true">→</span>
              </Link>
              <a className="button button-quiet" href="#features">Explore the experience</a>
            </div>
            {isAuthenticated && <p className="landing-session">Signed in as {user?.email || 'your account'}.</p>}
          </div>

          <div className="landing-orbit" aria-hidden="true">
            <div className="orbit-glow" />
            <div className="orbit-card orbit-card-main">
              <div className="orbit-card-top"><span className="mini-avatar">EA</span><span className="status-pill">Active</span></div>
              <span className="orbit-label">Your workspace</span>
              <strong>Everything is ready.</strong>
              <div className="orbit-progress"><span /></div>
              <small>Secure session · 100% ready</small>
            </div>
            <div className="orbit-card orbit-card-float one"><span>✓</span> Authenticated</div>
            <div className="orbit-card orbit-card-float two"><span>↗</span> Next action</div>
          </div>
        </section>

        <section className="landing-proof" id="experience">
          <div><strong>Built for clarity</strong><span>Every screen has a purpose and a next step.</span></div>
          <div><strong>Fast entry</strong><span>Get from landing page to workspace without friction.</span></div>
          <div><strong>Responsive</strong><span>Designed to feel intentional on every screen size.</span></div>
        </section>

        <section className="landing-features" id="features">
          <div className="section-heading">
            <span className="section-kicker">THE FOUNDATION</span>
            <h2>A better flow, not just a new look.</h2>
            <p>The redesign keeps the existing authentication architecture while making the user journey much more obvious.</p>
          </div>
          <div className="feature-grid">
            {highlights.map(([number, title, description]) => (
              <article className="feature-card" key={number}>
                <span className="feature-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <Link className="brand" to="/"><span className="brand-mark">EA</span><span className="brand-name">Express App</span></Link>
          <span>Secure. Focused. Ready.</span>
        </footer>
      </div>
    </main>
  )
}

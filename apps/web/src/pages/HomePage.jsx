import { Link } from 'react-router-dom'
import './HomePage.css'

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-shell">
        <nav className="home-nav" aria-label="Main navigation">
          <Link className="home-brand" to="/" aria-label="Express App home">
            <span className="home-brand-mark" aria-hidden="true">EA</span>
            <span>Express App</span>
          </Link>
          <Link className="home-nav-link" to="/login">Sign in</Link>
        </nav>

        <section className="home-hero">
          <div className="home-copy">
            <p className="home-eyebrow">Simple. Secure. Connected.</p>
            <h1>Everything you need, in one place.</h1>
            <p>
              A clean, secure foundation for your application. Sign in to access your account
              and continue where you left off.
            </p>
            <div className="home-actions">
              <Link className="home-primary" to="/login">Get started</Link>
              <Link className="home-secondary" to="/login">Sign in</Link>
            </div>
          </div>

          <div className="home-visual" aria-hidden="true">
            <div className="home-visual-card">
              <strong>Welcome to Express App</strong>
              <span>Your secure application experience starts here.</span>
            </div>
          </div>
        </section>

        <footer className="home-footer">© Express App. Built for a fast, focused experience.</footer>
      </div>
    </main>
  )
}

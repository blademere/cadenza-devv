import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { getOAuthLoginUrl } from '../features/auth/auth.api'
import './LoginPage.css'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isBusy = isSubmitting || isLoading

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      window.location.assign('/dashboard')
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Check your details and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuthLogin = (provider) => {
    setError('')
    window.location.assign(getOAuthLoginUrl(provider))
  }

  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="auth-shell">
        <header className="auth-nav">
          <Link className="brand" to="/" aria-label="Back to Express App home">
            <span className="brand-mark">EA</span>
            <span className="brand-name">Express App</span>
          </Link>
          <Link className="auth-home-link" to="/">Back to home</Link>
        </header>

        <section className="auth-layout" aria-label="Sign in">
          <aside className="auth-intro">
            <span className="auth-kicker">YOUR WORKSPACE AWAITS</span>
            <h1>Pick up exactly where you left off.</h1>
            <p>Sign in once and move straight into your focused workspace. Your secure session keeps the experience simple.</p>
            <div className="auth-points">
              <div><span>✓</span><p><strong>One secure session</strong><small>Stay authenticated across your workspace.</small></p></div>
              <div><span>✓</span><p><strong>Multiple sign-in options</strong><small>Use email, Google, or Facebook.</small></p></div>
              <div><span>✓</span><p><strong>Clear next steps</strong><small>Your dashboard is the destination.</small></p></div>
            </div>
          </aside>

          <div className="auth-card">
            <div className="auth-card-heading">
              <div className="auth-card-icon" aria-hidden="true">→</div>
              <div><span>Welcome back</span><h2>Sign in to continue</h2></div>
            </div>

            <div className="oauth-stack" aria-label="Social sign in options">
              <button className="oauth-button" type="button" onClick={() => handleOAuthLogin('google')} disabled={isBusy}>
                <span className="oauth-icon google">G</span> Continue with Google
              </button>
              <button className="oauth-button" type="button" onClick={() => handleOAuthLogin('facebook')} disabled={isBusy}>
                <span className="oauth-icon facebook">f</span> Continue with Facebook
              </button>
            </div>

            <div className="auth-divider"><span>or use email</span></div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
              </div>
              <div className="auth-field">
                <div className="field-label-row"><label htmlFor="login-password">Password</label><span>Required</span></div>
                <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" minLength={8} required />
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={isBusy}>{isSubmitting ? 'Signing you in…' : 'Sign in'} <span aria-hidden="true">→</span></button>
            </form>

            <p className="auth-security"><span>●</span> Your connection is protected by secure authentication.</p>
          </div>
        </section>

        <footer className="auth-footer">© Express App <span>•</span> Secure access to your workspace</footer>
      </div>
    </main>
  )
}

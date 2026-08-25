import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { getOAuthLoginUrl } from '../features/auth/auth.api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const isBusy = isSubmitting || isLoading

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuthLogin = (provider) => {
    setError('')
    window.location.assign(getOAuthLoginUrl(provider))
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Sign in">
        <aside className="login-brand-panel">
          <div className="login-brand-mark" aria-hidden="true">EA</div>

          <div className="login-brand-copy">
            <h1>Welcome back.</h1>
            <p>Sign in to continue to your account and pick up where you left off.</p>
          </div>

          <div className="login-brand-footer">Express App</div>
        </aside>

        <div className="login-form-panel">
          <header className="login-header">
            <h2>Sign in to your account</h2>
            <p>Choose a quick sign-in option or use your email.</p>
          </header>

          <div className="login-oauth" aria-label="Social sign in options">
            <button
              className="login-oauth-button"
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isBusy}
            >
              <span className="login-oauth-icon google" aria-hidden="true">G</span>
              Continue with Google
            </button>
            <button
              className="login-oauth-button"
              type="button"
              onClick={() => handleOAuthLogin('facebook')}
              disabled={isBusy}
            >
              <span className="login-oauth-icon facebook" aria-hidden="true">f</span>
              Continue with Facebook
            </button>
          </div>

          <div className="login-divider" role="separator"><span>or continue with email</span></div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                minLength={8}
                required
              />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={isBusy}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

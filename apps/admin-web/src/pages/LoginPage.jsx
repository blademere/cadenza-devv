import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { getOAuthLoginUrl } from '../features/auth/auth.api'
import { Button, ButtonText } from '../../components/ui/button'
import { Input, InputField } from '../../components/ui/input'
import { Text } from '../../components/ui/text'
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
            <span className="brand-name">Express App Admin</span>
          </Link>
          <Link className="auth-home-link" to="/">Back to home</Link>
        </header>

        <section className="auth-layout" aria-label="Sign in">
          <aside className="auth-intro">
            <span className="auth-kicker">ADMIN WORKSPACE AWAITS</span>
            <h1>Pick up exactly where you left off.</h1>
            <p>Sign in once and move straight into your focused administrative workspace.</p>
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
              <Button variant="outline" className="oauth-button" onPress={() => handleOAuthLogin('google')} disabled={isBusy}>
                <ButtonText>Continue with Google</ButtonText>
              </Button>
              <Button variant="outline" className="oauth-button" onPress={() => handleOAuthLogin('facebook')} disabled={isBusy}>
                <ButtonText>Continue with Facebook</ButtonText>
              </Button>
            </div>

            <div className="auth-divider"><span>or use email</span></div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <Input>
                  <InputField id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
                </Input>
              </div>
              <div className="auth-field">
                <div className="field-label-row"><label htmlFor="login-password">Password</label><span>Required</span></div>
                <Input>
                  <InputField id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" minLength={8} required />
                </Input>
              </div>
              {error && <Text size="sm" className="auth-error" role="alert">{error}</Text>}
              <Button className="auth-submit" type="submit" disabled={isBusy}>
                <ButtonText>{isSubmitting ? 'Signing you in…' : 'Sign in →'}</ButtonText>
              </Button>
            </form>

            <Text size="xs" className="auth-security">● Your connection is protected by secure authentication.</Text>
          </div>
        </section>

        <footer className="auth-footer">© Express App <span>•</span> Secure access to your workspace</footer>
      </div>
    </main>
  )
}

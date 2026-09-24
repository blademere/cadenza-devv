import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle, MusicNotes } from '@phosphor-icons/react'
import { useAuth } from '../components/AuthProvider'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { branding } from '../../../config/branding'
import './LoginPage.css'

const benefits = [
  'Manage music lessons and scheduled sessions',
  'Book instruments and band rooms',
  'Keep payments and booking history together',
]

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (busy || isLoading) return
    setError('')
    setBusy(true)
    try {
      await login({ email: email.trim().toLowerCase(), password })
      window.location.assign('/app/dashboard')
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="cadenza-login">
      <section className="cadenza-login-brand">
        <Link to="/" className="cadenza-login-back"><ArrowLeft weight="bold" />Back to Cadenza</Link>
        <div className="cadenza-login-brand-content">
          <div className="cadenza-login-logo"><img src="/logo.png" alt={branding.name} /></div>
          <span className="cadenza-section-label">The Cadenza workspace</span>
          <h1>Keep your music life in rhythm.</h1>
          <p>Access lessons, rentals, rooms, schedules, payments, and your account from one focused workspace.</p>
          <div className="cadenza-login-benefits">
            {benefits.map((benefit) => <div key={benefit}><CheckCircle weight="fill" /><span>{benefit}</span></div>)}
          </div>
        </div>
        <div className="cadenza-login-art" aria-hidden="true">
          <div className="cadenza-login-art-line" />
          <MusicNotes weight="duotone" />
          <span>01</span><span>02</span><span>03</span>
        </div>
      </section>

      <section className="cadenza-login-form-panel">
        <div className="cadenza-login-form-wrap">
          <div className="cadenza-mobile-brand"><img src="/logo.png" alt="" /><span>{branding.name}</span></div>
          <div className="cadenza-login-heading">
            <span className="cadenza-section-label">Member access</span>
            <h2>Welcome back.</h2>
            <p>Sign in to continue to your Cadenza workspace.</p>
          </div>

          {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}

          <form onSubmit={submit} className="cadenza-login-form">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required />
            </div>
            <Button className="cadenza-login-submit" type="submit" disabled={busy || isLoading}>
              {busy ? 'Signing in…' : 'Sign in'}{!busy && <ArrowRight weight="bold" />}
            </Button>
          </form>

          <p className="cadenza-login-help">Need an account or help accessing Cadenza? Contact the front desk.</p>
          <Link className="cadenza-login-home-link" to="/"><ArrowLeft weight="bold" />Return to homepage</Link>
        </div>
        <span className="cadenza-login-corner">CADENZA / 01</span>
      </section>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import './OAuthCallbackPage.css'

const ERROR_MESSAGES = {
  oauth_denied: 'OAuth sign-in was cancelled or denied.',
  invalid_oauth_state: 'The OAuth sign-in session expired or was invalid. Please try again.',
  oauth_unauthorized: 'The OAuth account could not be authenticated.',
  account_exists: 'An account already exists with this email address. Sign in with that account instead.',
  oauth_failed: 'OAuth sign-in failed. Please try again.',
  oauth_link_conflict: 'That social account is already linked to another account.',
  oauth_link_failed: 'The social account could not be linked.',
}

export default function OAuthCallbackPage({ mode = 'success' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refresh } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const complete = async () => {
      if (mode === 'failure') {
        if (!cancelled) setError(ERROR_MESSAGES[searchParams.get('error')] ?? 'OAuth sign-in failed. Please try again.')
        return
      }
      const session = await refresh()
      if (cancelled) return
      if (session?.accessToken) {
        navigate('/dashboard', { replace: true })
        return
      }
      setError('OAuth sign-in completed, but the application could not establish your session.')
    }
    complete().catch(() => { if (!cancelled) setError('OAuth sign-in could not be completed. Please try again.') })
    return () => { cancelled = true }
  }, [mode, navigate, refresh, searchParams])

  const isFailure = mode === 'failure' || Boolean(error)
  if (!isFailure) return <main className="oauth-callback-page" aria-live="polite"><section className="oauth-callback-card"><div className="oauth-callback-mark" aria-hidden="true">EA</div><h1>Signing you in…</h1><p>Please wait while we securely finish authentication.</p></section></main>

  return <main className="oauth-callback-page"><section className="oauth-callback-card"><div className="oauth-callback-mark" aria-hidden="true">EA</div><h1>{mode === 'failure' ? 'Sign-in failed' : 'Unable to sign you in'}</h1><p className="oauth-callback-error" role="alert">{error}</p><div className="oauth-callback-actions"><button className="oauth-callback-button" type="button" onClick={() => navigate('/login', { replace: true })}>Back to sign in</button></div></section></main>
}

import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

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

  return (
    <main>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

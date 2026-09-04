import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/components/AuthProvider'

export default function App() {
  const { isAuthenticated, user, logout, isLoading } = useAuth()

  return (
    <>
      <header>
        <nav aria-label="Main navigation">
          <Link to="/">Home</Link>
          {!isLoading && !isAuthenticated && <Link to="/login">Sign in</Link>}
          {!isLoading && isAuthenticated && (
            <span>
              {user?.email ? `Signed in as ${user.email}` : 'Signed in'}{' '}
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </span>
          )}
        </nav>
      </header>
      <Outlet />
    </>
  )
}

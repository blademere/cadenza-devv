import { Link, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <>
      <header>
        <nav aria-label="Main navigation">
          <Link to="/">Home</Link>
        </nav>
      </header>
      <Outlet />
    </>
  )
}

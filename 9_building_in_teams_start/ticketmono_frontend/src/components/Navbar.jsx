import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Extracted into its own component so it can call useAuth().
// Hooks cannot be called in App directly because App renders the providers —
// the context value is not available until a child component renders.
function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    // logout() clears tokens from localStorage and sets user to null in context.
    // We then navigate to /login so the user lands on a public page.
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar bg-base-100 shadow px-6">
      <div className="flex-1">
        <span className="text-xl font-bold">Ticketmono</span>
      </div>
      <div className="flex gap-4 items-center">
        <NavLink to="/" className="btn btn-ghost btn-sm">Events</NavLink>
        {user ? (
          <>
            <span className="text-sm text-base-content/60">Hi, {user.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn btn-ghost btn-sm">Login</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">Register</NavLink>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar

import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Wrap any route that requires the user to be logged in.
// If the user is not authenticated, they are redirected to /login.
// The `replace` prop replaces the current history entry so the user
// cannot press Back to get to the protected page without logging in.
function ProtectedRoute({ children }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute

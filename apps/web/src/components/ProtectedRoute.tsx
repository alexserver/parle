import { useAuth } from '../contexts/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    )
  }

  // Redirect to login page if not authenticated
  if (!isAuthenticated) {
    const redirectUrl = `/login?from=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirectUrl} replace />
  }

  // Render protected content if authenticated
  return <>{children}</>
}

export default ProtectedRoute
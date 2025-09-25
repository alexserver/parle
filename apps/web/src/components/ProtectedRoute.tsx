import { useAuth } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth status
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    )
  }

  // Redirect to landing page with sign-in prompt if not signed in
  if (!isSignedIn) {
    const redirectUrl = `/?sign-in=true&from=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirectUrl} replace />
  }

  // Render protected content if authenticated
  return <>{children}</>
}

export default ProtectedRoute
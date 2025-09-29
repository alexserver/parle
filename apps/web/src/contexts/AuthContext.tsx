import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  username: string
  email: string
  role: string
  plan: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'parle-auth-token'
const USER_KEY = 'parle-auth-user'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Helper function to check if JWT token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      console.error('Error parsing token:', error)
      return true // Consider invalid tokens as expired
    }
  }

  // Load auth state from localStorage on app startup
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)
      
      if (storedToken && storedUser) {
        // Check if token is expired before setting auth state
        if (isTokenExpired(storedToken)) {
          console.log('🚫 Stored token is expired, clearing auth state')
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        } else {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      }
    } catch (error) {
      console.error('Error loading auth state from localStorage:', error)
      // Clear invalid data
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Login failed')
      }

      const data = await response.json()
      
      if (!data.success || !data.token || !data.user) {
        throw new Error('Invalid login response')
      }

      // Store auth data
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      
      setToken(data.token)
      setUser(data.user)

    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = (): void => {
    // Clear local storage
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    
    // Clear state
    setToken(null)
    setUser(null)
  }

  const isAuthenticated = !!(token && user)

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
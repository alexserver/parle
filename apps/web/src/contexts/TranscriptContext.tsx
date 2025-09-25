import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getAllTranscripts, Conversation } from '../api'

interface TranscriptContextType {
  transcripts: Conversation[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  loadTranscripts: () => Promise<void>
  refreshTranscripts: () => Promise<void>
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined)

export const useTranscripts = () => {
  const context = useContext(TranscriptContext)
  if (context === undefined) {
    throw new Error('useTranscripts must be used within a TranscriptProvider')
  }
  return context
}

interface TranscriptProviderProps {
  children: ReactNode
}

export const TranscriptProvider = ({ children }: TranscriptProviderProps) => {
  const [transcripts, setTranscripts] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getToken, isLoaded } = useAuth()

  const loadTranscripts = useCallback(async () => {
    // Don't load if auth is not ready
    if (!isLoaded) return
    
    setIsLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const data = await getAllTranscripts(token)
      setTranscripts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcripts')
      console.error('Failed to load transcripts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, isLoaded])

  const refreshTranscripts = useCallback(async () => {
    if (!isLoaded || isRefreshing) return
    
    setIsRefreshing(true)
    setError(null)
    try {
      const token = await getToken()
      const data = await getAllTranscripts(token)
      setTranscripts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh transcripts')
      console.error('Failed to refresh transcripts:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [getToken, isLoaded, isRefreshing])

  const value = {
    transcripts,
    isLoading,
    isRefreshing,
    error,
    loadTranscripts,
    refreshTranscripts
  }

  return (
    <TranscriptContext.Provider value={value}>
      {children}
    </TranscriptContext.Provider>
  )
}

export default TranscriptProvider
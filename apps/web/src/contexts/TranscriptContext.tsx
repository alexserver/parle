import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getAllTranscripts, deleteConversation, Conversation } from '../api'

interface TranscriptContextType {
  transcripts: Conversation[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  loadTranscripts: () => Promise<void>
  refreshTranscripts: () => Promise<void>
  deleteTranscript: (id: string) => Promise<void>
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
  const { token, isAuthenticated } = useAuth()

  const loadTranscripts = useCallback(async () => {
    // Don't load if not authenticated
    if (!isAuthenticated) return
    
    setIsLoading(true)
    setError(null)
    try {
      console.log('🔄 Loading transcripts...')
      console.log('🔐 Got token for transcripts:', !!token)
      const data = await getAllTranscripts(token)
      setTranscripts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcripts')
      console.error('Failed to load transcripts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, isAuthenticated])

  const refreshTranscripts = useCallback(async () => {
    if (!isAuthenticated || isRefreshing) return
    
    setIsRefreshing(true)
    setError(null)
    try {
      const data = await getAllTranscripts(token)
      setTranscripts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh transcripts')
      console.error('Failed to refresh transcripts:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [token, isAuthenticated, isRefreshing])

  const deleteTranscript = useCallback(async (id: string) => {
    if (!isAuthenticated) return
    
    setError(null)
    try {
      console.log('🗑️ Deleting transcript:', id)
      await deleteConversation(id, token)
      
      // Remove the transcript from local state immediately (optimistic update)
      setTranscripts(prev => prev.filter(transcript => transcript.id !== id))
      console.log('✅ Transcript deleted and removed from local state')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transcript')
      console.error('Failed to delete transcript:', err)
      throw err // Re-throw to allow UI to handle the error
    }
  }, [token, isAuthenticated])

  const value = {
    transcripts,
    isLoading,
    isRefreshing,
    error,
    loadTranscripts,
    refreshTranscripts,
    deleteTranscript
  }

  return (
    <TranscriptContext.Provider value={value}>
      {children}
    </TranscriptContext.Provider>
  )
}

export default TranscriptProvider
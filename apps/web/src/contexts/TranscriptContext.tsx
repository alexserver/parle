import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { getAllTranscripts, Conversation } from '../api'

interface TranscriptContextType {
  transcripts: Conversation[]
  isLoading: boolean
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
  const [error, setError] = useState<string | null>(null)

  const loadTranscripts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAllTranscripts()
      setTranscripts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcripts')
      console.error('Failed to load transcripts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshTranscripts = useCallback(async () => {
    try {
      const data = await getAllTranscripts()
      setTranscripts(data)
    } catch (err) {
      console.error('Failed to refresh transcripts:', err)
    }
  }, [])

  const value = {
    transcripts,
    isLoading,
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
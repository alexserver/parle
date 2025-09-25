const API_BASE_URL = '/api'

export interface UploadResponse {
  id: string
  status: 'initial' | 'transcribed' | 'summarized' | 'failed'
  transcriptPreview?: string
  summary?: string
}

export interface Conversation {
  id: string
  userId: string // Add userId field
  originalFilename: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  durationSec?: number
  status: 'initial' | 'transcribed' | 'summarized' | 'failed'
  transcriptText?: string
  summaryText?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

/**
 * Helper function to create authentication headers
 */
function createAuthHeaders(token: string | null): HeadersInit {
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Enhanced error handling for API responses
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Authentication failed - redirect to sign in
    window.location.href = '/?sign-in=true'
    throw new Error('Authentication required. Please sign in again.')
  }
  
  if (response.status === 403) {
    throw new Error('Access denied. You do not have permission to access this resource.')
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}

/**
 * Helper to handle token retrieval errors
 */
function handleTokenError(error: unknown): never {
  console.error('Failed to get authentication token:', error)
  throw new Error('Authentication failed. Please sign in again.')
}

export async function uploadAudio(file: File, token: string | null): Promise<UploadResponse> {
  try {
    const formData = new FormData()
    formData.append('audio', file)

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: createAuthHeaders(token),
      body: formData
    })

    return handleApiResponse<UploadResponse>(response)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Upload failed. Please try again.')
  }
}

export async function getAllTranscripts(token: string | null): Promise<Conversation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/transcripts`, {
      headers: createAuthHeaders(token)
    })

    return handleApiResponse<Conversation[]>(response)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get transcripts. Please try again.')
  }
}

export async function getTranscript(id: string, token: string | null): Promise<Conversation> {
  try {
    const response = await fetch(`${API_BASE_URL}/transcripts/${id}`, {
      headers: createAuthHeaders(token)
    })

    return handleApiResponse<Conversation>(response)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to get transcript. Please try again.')
  }
}
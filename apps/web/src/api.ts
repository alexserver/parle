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

export async function uploadAudio(file: File, token: string | null): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('audio', file)

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: createAuthHeaders(token),
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

export async function getAllTranscripts(token: string | null): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/transcripts`, {
    headers: createAuthHeaders(token)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get transcripts')
  }

  return response.json()
}

export async function getTranscript(id: string, token: string | null): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/transcripts/${id}`, {
    headers: createAuthHeaders(token)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get transcript')
  }

  return response.json()
}
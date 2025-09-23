const API_BASE_URL = '/api'

export interface UploadResponse {
  id: string
  status: 'initial' | 'transcribed' | 'summarized' | 'failed'
  transcriptPreview?: string
  summary?: string
}

export interface Conversation {
  id: string
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

export async function uploadAudio(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('audio', file)

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

export async function getTranscript(id: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/transcripts/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get transcript')
  }

  return response.json()
}
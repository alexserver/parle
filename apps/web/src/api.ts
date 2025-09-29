const API_BASE_URL = '/api'
console.log('🔧 API_BASE_URL configured as:', API_BASE_URL)

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
  console.log('📊 Response details:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    url: response.url,
    headers: Object.fromEntries(response.headers.entries())
  })
  
  if (response.status === 401) {
    // Authentication failed - clear auth state and redirect to login
    console.log('🚫 401 Unauthorized - clearing auth state and redirecting to login')
    
    // Clear localStorage to prevent infinite refresh loop
    localStorage.removeItem('parle-auth-token')
    localStorage.removeItem('parle-auth-user')
    
    window.location.href = '/login'
    throw new Error('Authentication required. Please sign in again.')
  }
  
  if (response.status === 403) {
    console.log('🚫 403 Forbidden')
    throw new Error('Access denied. You do not have permission to access this resource.')
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
    console.log('❌ Request failed:', { status: response.status, error })
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }
  
  const data = await response.json()
  console.log('✅ Success response:', data)
  return data
}


export async function uploadAudio(file: File, token: string | null): Promise<UploadResponse> {
  try {
    console.log('🔐 Upload - Token present:', !!token)
    
    const formData = new FormData()
    formData.append('audio', file)
    
    const headers = createAuthHeaders(token)
    console.log('🔐 Upload - Headers:', headers)

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData
    })
    
    console.log('📡 Upload - Response status:', response.status)

    return handleApiResponse<UploadResponse>(response)
  } catch (error) {
    console.error('❌ Upload - Error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Upload failed. Please try again.')
  }
}

export async function getAllTranscripts(token: string | null): Promise<Conversation[]> {
  try {
    console.log('🔐 Get transcripts - Token present:', !!token)
    
    const headers = createAuthHeaders(token)
    console.log('🔐 Get transcripts - Headers:', headers)

    const url = `${API_BASE_URL}/transcripts`
    console.log('🌐 Making request to:', url)
    
    console.log('⏱️ Starting fetch request...')
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    
    console.log('📡 Get transcripts - Response received, status:', response.status)

    return handleApiResponse<Conversation[]>(response)
  } catch (error) {
    console.error('❌ Get transcripts - Error:', error)
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
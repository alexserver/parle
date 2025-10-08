import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranscripts } from '../contexts/TranscriptContext'
import { getTranscript, regenerateTranscript, regenerateSummary, reUploadAudio, Conversation } from '../api'
import ConfirmationDialog from '../components/ConfirmationDialog'

const TranscriptDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { deleteTranscript } = useTranscripts()
  const [transcript, setTranscript] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, filename: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRegeneratingTranscript, setIsRegeneratingTranscript] = useState(false)
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false)
  const [regenerationError, setRegenerationError] = useState<string | null>(null)
  const [showTranscriptRegenWarning, setShowTranscriptRegenWarning] = useState(false)
  const [isReUploading, setIsReUploading] = useState(false)
  const [reUploadError, setReUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!id) {
      navigate('/transcripts')
      return
    }

    const fetchTranscript = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getTranscript(id, token)
        setTranscript(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transcript')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTranscript()
  }, [id, navigate, token])

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'summarized': return 'bg-green-100 text-green-800'
      case 'transcribed': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const handleDeleteClick = (id: string, filename: string) => {
    setDeleteConfirm({ id, filename })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    
    setIsDeleting(true)
    try {
      await deleteTranscript(deleteConfirm.id)
      // Navigate back to transcripts list after successful deletion
      navigate('/transcripts')
    } catch (error) {
      console.error('Delete failed:', error)
      // Error is already handled in the context and displayed via error state
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  const handleRegenerateTranscript = async () => {
    if (!transcript || !id) return
    
    // Show warning modal if summary exists
    if (transcript.summaryText && transcript.summaryText.trim().length > 0) {
      setShowTranscriptRegenWarning(true)
      return
    }
    
    // If no summary, proceed directly
    performTranscriptRegeneration()
  }

  const performTranscriptRegeneration = async () => {
    if (!transcript || !id) return
    
    setShowTranscriptRegenWarning(false)
    setIsRegeneratingTranscript(true)
    setRegenerationError(null)
    
    try {
      console.log('🔄 Starting transcript regeneration for:', id)
      const updatedConversation = await regenerateTranscript(id, token)
      setTranscript(updatedConversation)
      console.log('✅ Transcript regenerated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate transcript'
      setRegenerationError(errorMessage)
      console.error('❌ Transcript regeneration failed:', error)
    } finally {
      setIsRegeneratingTranscript(false)
    }
  }

  const handleTranscriptRegenCancel = () => {
    setShowTranscriptRegenWarning(false)
  }

  // Check if conversation is in failed upload state
  const isFailedUpload = (conversation: Conversation) => {
    return conversation.status === 'initial' && (!conversation.storagePath || conversation.storagePath.trim() === '')
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setReUploadError(null)
    }
  }

  const handleReUpload = async () => {
    if (!selectedFile || !transcript || !id) return
    
    setIsReUploading(true)
    setReUploadError(null)
    
    try {
      console.log('🔄 Starting re-upload for:', id, 'with file:', selectedFile.name)
      const updatedConversation = await reUploadAudio(id, selectedFile, token)
      setTranscript(updatedConversation)
      setSelectedFile(null)
      console.log('✅ Re-upload completed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to re-upload file'
      setReUploadError(errorMessage)
      console.error('❌ Re-upload failed:', error)
    } finally {
      setIsReUploading(false)
    }
  }

  const handleRegenerateSummary = async () => {
    if (!transcript || !id) return
    
    setIsRegeneratingSummary(true)
    setRegenerationError(null)
    
    try {
      console.log('🔄 Starting summary regeneration for:', id)
      const updatedConversation = await regenerateSummary(id, token)
      setTranscript(updatedConversation)
      console.log('✅ Summary regenerated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate summary'
      setRegenerationError(errorMessage)
      console.error('❌ Summary regeneration failed:', error)
    } finally {
      setIsRegeneratingSummary(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading transcript...</p>
      </div>
    )
  }

  if (error || !transcript) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Transcript</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <Link
            to="/transcripts"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Transcripts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/" className="text-gray-700 hover:text-blue-600 inline-flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Home
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <Link to="/transcripts" className="ml-1 text-gray-700 hover:text-blue-600 md:ml-2">Transcripts</Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-gray-500 md:ml-2 truncate">{transcript.originalFilename}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {transcript.originalFilename}
            </h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transcript.status)}`}>
                {transcript.status}
              </span>
              <span className="text-sm text-gray-500">
                {formatFileSize(transcript.sizeBytes)}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(transcript.createdAt)}
              </span>
            </div>
          </div>
          <div className="ml-4 flex space-x-2">
            <button
              onClick={() => handleDeleteClick(transcript.id, transcript.originalFilename)}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <Link
              to="/transcripts"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">File Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">File Name</dt>
              <dd className="text-sm text-gray-900">{transcript.originalFilename}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">MIME Type</dt>
              <dd className="text-sm text-gray-900">{transcript.mimeType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">File Size</dt>
              <dd className="text-sm text-gray-900">{formatFileSize(transcript.sizeBytes)}</dd>
            </div>
            {transcript.durationSec && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="text-sm text-gray-900">{transcript.durationSec} seconds</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Processing Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm text-gray-900">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transcript.status)}`}>
                  {transcript.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDate(transcript.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900">{formatDate(transcript.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Regeneration Error Display */}
      {regenerationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Regeneration Error</h3>
              <p className="mt-1 text-sm text-red-700">{regenerationError}</p>
              <button
                onClick={() => setRegenerationError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-upload Error Display */}
      {reUploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Re-upload Error</h3>
              <p className="mt-1 text-sm text-red-700">{reUploadError}</p>
              <button
                onClick={() => setReUploadError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-upload Section for Failed Uploads */}
      {isFailedUpload(transcript) && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Upload Failed</h3>
              <p className="text-sm text-yellow-700 mb-4">
                The audio file was not successfully uploaded. You can select a new file to retry the upload process.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="audio-file" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Audio File
                  </label>
                  <input
                    id="audio-file"
                    name="audio-file"
                    type="file"
                    accept=".mp3,.mp4,.m4a,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,video/mp4"
                    onChange={handleFileSelect}
                    disabled={isReUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: MP3, MP4, M4A (max 25MB)
                  </p>
                </div>
                
                {selectedFile && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-sm text-blue-700 font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-blue-600 ml-2">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleReUpload}
                    disabled={!selectedFile || isReUploading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Re-uploading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Re-upload File
                      </>
                    )}
                  </button>
                  
                  {selectedFile && !isReUploading && (
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Text */}
      {transcript.transcriptText && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Full Transcript</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleRegenerateTranscript}
                disabled={isRegeneratingTranscript || !transcript.storagePath}
                className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!transcript.storagePath ? "No audio file available for regeneration" : "Regenerate transcript using OpenAI"}
              >
                {isRegeneratingTranscript ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-1"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
              <button
                onClick={() => copyToClipboard(transcript.transcriptText!)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          </div>
          <div className="prose max-w-none">
            <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {transcript.transcriptText}
            </div>
          </div>
        </div>
      )}

      {/* Summary - Always show if transcript exists */}
      {transcript.transcriptText && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Summary</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleRegenerateSummary}
                disabled={isRegeneratingSummary || !transcript.transcriptText}
                className="inline-flex items-center px-3 py-1 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!transcript.transcriptText ? "No transcript available for summarization" : transcript.summaryText ? "Regenerate summary using OpenAI" : "Generate summary using OpenAI"}
              >
                {isRegeneratingSummary ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-1"></div>
                    {transcript.summaryText ? 'Regenerating...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {transcript.summaryText ? 'Regenerate' : 'Generate Summary'}
                  </>
                )}
              </button>
              {transcript.summaryText && (
                <button
                  onClick={() => copyToClipboard(transcript.summaryText!)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              )}
            </div>
          </div>
          
          {transcript.summaryText ? (
            <div className="bg-blue-50 rounded-lg p-4 text-sm leading-relaxed">
              {transcript.summaryText}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-500 mb-1">No summary available</p>
              <p className="text-xs text-gray-400">Click "Generate Summary" to create a summary of this transcript</p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {transcript.errorMessage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Error Details</h2>
          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
            {transcript.errorMessage}
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Conversation"
        message={deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.filename}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        confirmButtonVariant="danger"
        isLoading={isDeleting}
        loadingText="Deleting..."
      />

      <ConfirmationDialog
        isOpen={showTranscriptRegenWarning}
        onClose={handleTranscriptRegenCancel}
        onConfirm={performTranscriptRegeneration}
        title="Regenerate Transcript?"
        message="Regenerating the transcript will remove the existing summary. You'll need to generate a new summary afterwards. Continue?"
        confirmText="Yes, Regenerate Transcript"
        confirmButtonVariant="warning"
        isLoading={isRegeneratingTranscript}
        loadingText="Regenerating..."
      />
    </div>
  )
}

export default TranscriptDetailPage
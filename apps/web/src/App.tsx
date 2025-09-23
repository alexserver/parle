import { useState, useEffect } from 'react'
import { uploadAudio, getTranscript, getAllTranscripts, UploadResponse, Conversation } from './api'
import './index.css'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allTranscripts, setAllTranscripts] = useState<Conversation[]>([])
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(true)
  const [selectedTranscript, setSelectedTranscript] = useState<Conversation | null>(null)

  // Load all transcripts on component mount
  useEffect(() => {
    loadAllTranscripts()
  }, [])

  const loadAllTranscripts = async () => {
    setIsLoadingTranscripts(true)
    try {
      const transcripts = await getAllTranscripts()
      setAllTranscripts(transcripts)
    } catch (err) {
      console.error('Failed to load transcripts:', err)
    } finally {
      setIsLoadingTranscripts(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    
    try {
      const result = await uploadAudio(file)
      setUploadResult(result)
      // Refresh the transcripts list after successful upload
      loadAllTranscripts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchId.trim()) return

    setError(null)
    
    try {
      const result = await getTranscript(searchId.trim())
      setSearchResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setSearchResult(null)
    }
  }

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

  const handleViewDetail = (transcript: Conversation) => {
    setSelectedTranscript(transcript)
  }

  const closeDetailModal = () => {
    setSelectedTranscript(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Audio Transcriber
        </h1>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload Audio File
          </h2>
          
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".mp3,.wav"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {file && (
              <div className="text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Processing...' : 'Upload & Transcribe'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-8">
            {error}
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Transcription Result
            </h2>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium">ID:</span> {uploadResult.id}
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  uploadResult.status === 'summarized' ? 'bg-green-100 text-green-800' :
                  uploadResult.status === 'transcribed' ? 'bg-blue-100 text-blue-800' :
                  uploadResult.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {uploadResult.status}
                </span>
              </div>
              
              {uploadResult.transcriptPreview && (
                <div>
                  <span className="font-medium">Transcript Preview:</span>
                  <p className="mt-1 p-3 bg-gray-50 rounded text-sm">
                    {uploadResult.transcriptPreview}
                  </p>
                </div>
              )}
              
              {uploadResult.summary && (
                <div>
                  <span className="font-medium">Summary:</span>
                  <p className="mt-1 p-3 bg-blue-50 rounded text-sm">
                    {uploadResult.summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Look Up Transcript by ID
          </h2>
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter transcript ID"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Search
            </button>
          </div>

          {searchResult && (
            <div className="mt-6 space-y-3">
              <div>
                <span className="font-medium">Filename:</span> {searchResult.originalFilename}
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  searchResult.status === 'summarized' ? 'bg-green-100 text-green-800' :
                  searchResult.status === 'transcribed' ? 'bg-blue-100 text-blue-800' :
                  searchResult.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {searchResult.status}
                </span>
              </div>
              
              {searchResult.transcriptText && (
                <div>
                  <span className="font-medium">Full Transcript:</span>
                  <p className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                    {searchResult.transcriptText}
                  </p>
                </div>
              )}
              
              {searchResult.summaryText && (
                <div>
                  <span className="font-medium">Summary:</span>
                  <p className="mt-1 p-3 bg-blue-50 rounded text-sm">
                    {searchResult.summaryText}
                  </p>
                </div>
              )}
              
              {searchResult.errorMessage && (
                <div>
                  <span className="font-medium">Error:</span>
                  <p className="mt-1 p-3 bg-red-50 rounded text-sm text-red-700">
                    {searchResult.errorMessage}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* All Transcripts Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            All Transcripts
          </h2>
          
          {isLoadingTranscripts ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading transcripts...</p>
            </div>
          ) : allTranscripts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transcripts found. Upload an audio file to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allTranscripts.map((transcript) => (
                    <tr key={transcript.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transcript.originalFilename}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transcript.mimeType}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(transcript.sizeBytes)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transcript.status)}`}>
                          {transcript.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transcript.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetail(transcript)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedTranscript && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Transcript Details
                  </h3>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">File Name:</span>
                      <p className="text-gray-700">{selectedTranscript.originalFilename}</p>
                    </div>
                    <div>
                      <span className="font-medium">Size:</span>
                      <p className="text-gray-700">{formatFileSize(selectedTranscript.sizeBytes)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-sm rounded-full ${getStatusColor(selectedTranscript.status)}`}>
                        {selectedTranscript.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p className="text-gray-700">{formatDate(selectedTranscript.createdAt)}</p>
                    </div>
                  </div>

                  {selectedTranscript.transcriptText && (
                    <div>
                      <span className="font-medium">Full Transcript:</span>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {selectedTranscript.transcriptText}
                      </div>
                    </div>
                  )}

                  {selectedTranscript.summaryText && (
                    <div>
                      <span className="font-medium">Summary:</span>
                      <div className="mt-2 p-4 bg-blue-50 rounded-lg text-sm">
                        {selectedTranscript.summaryText}
                      </div>
                    </div>
                  )}

                  {selectedTranscript.errorMessage && (
                    <div>
                      <span className="font-medium">Error:</span>
                      <div className="mt-2 p-4 bg-red-50 rounded-lg text-sm text-red-700">
                        {selectedTranscript.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
import { useState } from 'react'
import { uploadAudio, getTranscript, UploadResponse, Conversation } from './api'
import './index.css'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      </div>
    </div>
  )
}

export default App
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadAudio, UploadResponse } from '../api'
import { useTranscripts } from '../contexts/TranscriptContext'

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const { refreshTranscripts } = useTranscripts()
  const navigate = useNavigate()

  const validateFile = (selectedFile: File): string | null => {
    // Check file size (25MB = 25 * 1024 * 1024 bytes)
    const maxSize = 25 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      return 'File size must be 25MB or less'
    }

    // Check file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'video/mp4']
    if (!allowedTypes.includes(selectedFile.type) && 
        !selectedFile.name.toLowerCase().match(/\.(mp3|mp4|m4a)$/)) {
      return 'Only MP3, MP4, and M4A files are supported'
    }

    return null
  }

  const handleFileSelection = (selectedFile: File) => {
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setUploadResult(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelection(selectedFile)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFileSelection(droppedFiles[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    
    try {
      const result = await uploadAudio(file)
      setUploadResult(result)
      // Refresh the transcripts list
      refreshTranscripts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleViewTranscript = () => {
    if (uploadResult?.id) {
      navigate(`/transcripts/${uploadResult.id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {uploadResult ? 'Transcription Complete' : 'Upload Audio File'}
        </h1>
        <p className="text-lg text-gray-600">
          {uploadResult 
            ? 'Your audio has been successfully transcribed and summarized' 
            : 'Upload your MP3, MP4 or M4A file to get started with AI transcription'
          }
        </p>
      </div>

      {/* Upload Section - only show when no results */}
      {!uploadResult && (
        <div className="bg-white rounded-lg shadow-md p-8 transition-all duration-300 ease-in-out">
          <div className="space-y-6">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Audio File
              </label>
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <svg
                    className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className={`flex text-sm ${isDragOver ? 'text-blue-700' : 'text-gray-600'}`}>
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".mp3,.mp4,.m4a"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className={`text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                    {isDragOver ? 'Drop your audio file here' : 'MP3, MP4, M4A up to 25MB'}
                  </p>
                </div>
              </div>
            </div>

            {/* Selected File Info */}
            {file && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      {file.name}
                    </p>
                    <p className="text-sm text-blue-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Upload & Transcribe'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-4">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="ml-2 text-xl font-semibold text-gray-800">
              Upload Successful!
            </h2>
          </div>
          
          <div className="space-y-4">
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

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleViewTranscript}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                View Full Transcript
              </button>
              <button
                onClick={() => {
                  setFile(null)
                  setUploadResult(null)
                  setError(null)
                  setIsDragOver(false)
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPage
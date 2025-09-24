import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranscripts } from '../contexts/TranscriptContext'

const HomePage = () => {
  const { transcripts, isLoading, loadTranscripts } = useTranscripts()

  useEffect(() => {
    loadTranscripts()
  }, [loadTranscripts])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'summarized': return 'bg-green-100 text-green-800'
      case 'transcribed': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const recentTranscripts = transcripts.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Parle, your conversation analyzer
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Transform your audio files into text with AI-powered transcription and summarization
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/upload"
          className="group relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Upload Audio</h3>
              <p className="text-blue-100">Upload MP3 or WAV files for transcription</p>
            </div>
          </div>
        </Link>

        <Link
          to="/transcripts"
          className="group relative bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">View Transcripts</h3>
              <p className="text-purple-100">Browse all your transcription history</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Transcripts */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Recent Transcripts</h2>
          <Link
            to="/transcripts"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading transcripts...</p>
          </div>
        ) : recentTranscripts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transcripts yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading your first audio file</p>
            <div className="mt-6">
              <Link
                to="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Upload Audio File
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTranscripts.map((transcript) => (
              <Link
                key={transcript.id}
                to={`/transcripts/${transcript.id}`}
                className="block hover:bg-gray-50 p-4 rounded-lg border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {transcript.originalFilename}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(transcript.createdAt)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transcript.status)}`}>
                      {transcript.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
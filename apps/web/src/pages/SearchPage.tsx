import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTranscript, Conversation } from '../api'

const SearchPage = () => {
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<Conversation | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchId.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResult(null)
    
    try {
      const result = await getTranscript(searchId.trim())
      setSearchResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Search Transcripts
        </h1>
        <p className="text-lg text-gray-600">
          Find a specific transcript by entering its ID
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="search-id" className="block text-sm font-medium text-gray-700 mb-2">
              Transcript ID
            </label>
            <div className="flex space-x-2">
              <input
                id="search-id"
                type="text"
                placeholder="Enter transcript ID (e.g., cmfx0xqe30000id1qji29itkg)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!searchId.trim() || isSearching}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Search Tips */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Search Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• You can find transcript IDs in the transcripts table or after uploading files</li>
            <li>• IDs are usually long strings like "cmfx0xqe30000id1qji29itkg"</li>
            <li>• Make sure to enter the complete ID for accurate results</li>
          </ul>
        </div>
      </div>

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

      {/* Search Results */}
      {searchResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="ml-2 text-xl font-semibold text-gray-800">
              Transcript Found!
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-gray-500">Filename</span>
                <span className="text-gray-900">{searchResult.originalFilename}</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500">Status</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(searchResult.status)}`}>
                  {searchResult.status}
                </span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500">Created</span>
                <span className="text-gray-900">{formatDate(searchResult.createdAt)}</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500">File Size</span>
                <span className="text-gray-900">{(searchResult.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>

            {searchResult.transcriptText && (
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-2">Transcript Preview</span>
                <p className="p-3 bg-gray-50 rounded text-sm line-clamp-3">
                  {searchResult.transcriptText.substring(0, 200)}
                  {searchResult.transcriptText.length > 200 ? '...' : ''}
                </p>
              </div>
            )}

            {searchResult.summaryText && (
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-2">Summary</span>
                <p className="p-3 bg-blue-50 rounded text-sm">
                  {searchResult.summaryText}
                </p>
              </div>
            )}

            {searchResult.errorMessage && (
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-2">Error</span>
                <p className="p-3 bg-red-50 rounded text-sm text-red-700">
                  {searchResult.errorMessage}
                </p>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <Link
                to={`/transcripts/${searchResult.id}`}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                View Full Details
              </Link>
              <button
                onClick={() => {
                  setSearchId('')
                  setSearchResult(null)
                  setError(null)
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Search Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-4">
          Don't have a transcript ID?
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/transcripts"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Browse All Transcripts
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload New File
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SearchPage
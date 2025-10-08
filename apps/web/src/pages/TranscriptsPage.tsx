import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmationDialog from '../components/ConfirmationDialog'
import SearchForm from '../components/SearchForm'
import { useTranscripts } from '../contexts/TranscriptContext'
import { Conversation } from '../api'

const TranscriptsPage = () => {
  const { transcripts, isLoading, loadTranscripts, deleteTranscript } = useTranscripts()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('filename')
  const [isSearching, setIsSearching] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; filename: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadTranscripts()
  }, [loadTranscripts])

  const handleSearch = async (query: string, type: string) => {
    setIsSearching(true)
    setSearchQuery(query)
    setSearchType(type)

    // Simulate search delay for UX (optional)
    setTimeout(() => {
      setIsSearching(false)
    }, 300)
  }

  const handleDeleteClick = (id: string, filename: string) => {
    setDeleteConfirm({ id, filename })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      await deleteTranscript(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Delete failed:', error)
      // Error is already handled in the context and displayed via error state
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  const filteredTranscripts = useMemo(() => {
    if (!searchQuery) {
      return transcripts
    }

    const query = searchQuery.toLowerCase()

    return transcripts.filter(transcript => {
      switch (searchType) {
        case 'filename':
          return transcript.originalFilename.toLowerCase().includes(query)
        case 'content':
          return transcript.transcriptText?.toLowerCase().includes(query) || false
        case 'summary':
          return transcript.summaryText?.toLowerCase().includes(query) || false
        case 'all':
          return (
            transcript.originalFilename.toLowerCase().includes(query) ||
            transcript.transcriptText?.toLowerCase().includes(query) ||
            transcript.summaryText?.toLowerCase().includes(query)
          )
        default:
          return true
      }
    })
  }, [transcripts, searchQuery, searchType])

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'summarized':
        return 'bg-green-100 text-green-800'
      case 'transcribed':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  // Check if conversation is in failed upload state
  const isFailedUpload = (transcript: Conversation) => {
    return (
      transcript.status === 'initial' &&
      (!transcript.storagePath || transcript.storagePath.trim() === '')
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>All Transcripts</h1>
          <p className='text-gray-600 mt-1'>
            {searchQuery ? (
              <>
                Found {filteredTranscripts.length} result
                {filteredTranscripts.length !== 1 ? 's' : ''} for "{searchQuery}"
                {searchType !== 'all' && ` in ${searchType}`}
              </>
            ) : (
              'Manage and view all your audio transcriptions'
            )}
          </p>
        </div>
        <Link
          to='/upload'
          className='inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700'
        >
          <svg className='-ml-1 mr-2 h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Upload New
        </Link>
      </div>

      {/* Search Form */}
      <SearchForm onSearch={handleSearch} isSearching={isSearching} />

      {/* Transcripts Table */}
      <div className='bg-white rounded-lg shadow-md overflow-hidden'>
        {isLoading ? (
          <div className='text-center py-12'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <p className='mt-2 text-gray-600'>Loading transcripts...</p>
          </div>
        ) : filteredTranscripts.length === 0 ? (
          <div className='text-center py-12'>
            <svg
              className='mx-auto h-12 w-12 text-gray-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              {searchQuery ? 'No matching transcripts found' : 'No transcripts found'}
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              {searchQuery
                ? 'Try adjusting your search terms or search type'
                : 'Get started by uploading your first audio file'}
            </p>
            <div className='mt-6'>
              <Link
                to='/upload'
                className='inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
              >
                <svg
                  className='-ml-1 mr-2 h-5 w-5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                Upload Audio File
              </Link>
            </div>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    File Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Size
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Created
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredTranscripts.map(transcript => (
                  <tr key={transcript.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div>
                        <div className='text-sm font-medium text-gray-900'>
                          {transcript.originalFilename}
                        </div>
                        <div className='text-sm text-gray-500'>{transcript.mimeType}</div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {formatFileSize(transcript.sizeBytes)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transcript.status)}`}
                      >
                        {transcript.status}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {formatDate(transcript.createdAt)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex space-x-3'>
                        {isFailedUpload(transcript) ? (
                          <Link
                            to={`/transcripts/${transcript.id}`}
                            className='text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-3 py-2 rounded-md transition-colors inline-flex items-center'
                            title='Upload failed - click to re-upload file'
                          >
                            <svg
                              className='h-4 w-4 mr-1'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                              />
                            </svg>
                            Re-upload
                          </Link>
                        ) : (
                          <Link
                            to={`/transcripts/${transcript.id}`}
                            className='text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors inline-flex items-center'
                          >
                            <svg
                              className='h-4 w-4 mr-1'
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                              />
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                              />
                            </svg>
                            View Details
                          </Link>
                        )}
                        <button
                          onClick={() =>
                            handleDeleteClick(transcript.id, transcript.originalFilename)
                          }
                          className='text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md transition-colors inline-flex items-center'
                        >
                          <svg
                            className='h-4 w-4 mr-1'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title='Delete Conversation'
        message={
          deleteConfirm
            ? `Are you sure you want to delete "${deleteConfirm.filename}"? This action cannot be undone.`
            : ''
        }
        confirmText='Delete'
        confirmButtonVariant='danger'
        isLoading={isDeleting}
        loadingText='Deleting...'
      />
    </div>
  )
}

export default TranscriptsPage

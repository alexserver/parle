import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react'

const LandingPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)

  useEffect(() => {
    // Redirect to dashboard if already signed in
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true })
      return
    }

    // Show sign-in prompt if redirected from protected route
    if (searchParams.get('sign-in') === 'true') {
      setShowSignInPrompt(true)
    }
  }, [isSignedIn, isLoaded, navigate, searchParams])

  // Don't render until auth is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Sign-in Required Banner */}
      {showSignInPrompt && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="ml-3 text-sm text-yellow-700">
                    <span className="font-medium">Authentication required.</span> Please sign in to access your transcripts and upload files.
                  </p>
                </div>
                <button
                  onClick={() => setShowSignInPrompt(false)}
                  className="text-yellow-600 hover:text-yellow-500"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Audio into
            <span className="text-blue-600"> Actionable Insights</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Parle uses advanced AI to transcribe your audio files and generate intelligent summaries, 
            making your conversations searchable and actionable.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <SignUpButton mode="modal">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
                Get Started Free
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Parle?
          </h2>
          <p className="text-lg text-gray-600">
            Powerful features designed to make your audio content more valuable
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="text-center p-6">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI-Powered Transcription
            </h3>
            <p className="text-gray-600">
              Get accurate transcriptions from your audio files using advanced speech recognition technology.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center p-6">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Smart Summaries
            </h3>
            <p className="text-gray-600">
              Automatically generate concise summaries of your transcriptions to quickly understand key points.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center p-6">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Searchable Archive
            </h3>
            <p className="text-gray-600">
              Find exactly what you're looking for across all your transcripts with powerful search capabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Supported Audio Formats
          </h3>
          <p className="text-gray-600 mb-8">
            Upload your audio files in multiple formats, up to 25MB each
          </p>
          <div className="flex justify-center space-x-8">
            <div className="bg-white rounded-lg px-6 py-3 shadow-sm">
              <span className="font-semibold text-gray-700">MP3</span>
            </div>
            <div className="bg-white rounded-lg px-6 py-3 shadow-sm">
              <span className="font-semibold text-gray-700">MP4</span>
            </div>
            <div className="bg-white rounded-lg px-6 py-3 shadow-sm">
              <span className="font-semibold text-gray-700">M4A</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of users who trust Parle to transcribe and analyze their audio content.
          </p>
          <SignUpButton mode="modal">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Transcribing Today
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
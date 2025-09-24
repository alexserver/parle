import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import TranscriptProvider from './contexts/TranscriptContext'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import TranscriptsPage from './pages/TranscriptsPage'
import TranscriptDetailPage from './pages/TranscriptDetailPage'
import './index.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<Layout />}>
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute>
                <TranscriptProvider>
                  <DashboardPage />
                </TranscriptProvider>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="upload" 
            element={
              <ProtectedRoute>
                <TranscriptProvider>
                  <UploadPage />
                </TranscriptProvider>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="transcripts" 
            element={
              <ProtectedRoute>
                <TranscriptProvider>
                  <TranscriptsPage />
                </TranscriptProvider>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="transcripts/:id" 
            element={
              <ProtectedRoute>
                <TranscriptProvider>
                  <TranscriptDetailPage />
                </TranscriptProvider>
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
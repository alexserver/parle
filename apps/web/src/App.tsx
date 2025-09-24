import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import TranscriptProvider from './contexts/TranscriptContext'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import TranscriptsPage from './pages/TranscriptsPage'
import TranscriptDetailPage from './pages/TranscriptDetailPage'
import './index.css'

function App() {
  return (
    <TranscriptProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="transcripts" element={<TranscriptsPage />} />
            <Route path="transcripts/:id" element={<TranscriptDetailPage />} />
          </Route>
        </Routes>
      </Router>
    </TranscriptProvider>
  )
}

export default App
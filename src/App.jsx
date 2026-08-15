import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LogUpload from './pages/LogUpload.jsx'
import IncidentDetail from './pages/IncidentDetail.jsx'

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function FullScreenLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-ink-950">
      <div className="w-2 h-2 rounded-full bg-signal animate-ping" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<Protected><LogUpload /></Protected>} />
      <Route path="/incidents/:id" element={<Protected><IncidentDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-ink-950 text-ink-100 gap-4">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-signal border-t-transparent animate-spin" />
        <span className="w-2 h-2 rounded-full bg-signal absolute animate-pulse shadow-glow" />
      </div>
      <p className="text-xs font-mono text-ink-400 tracking-wider">INITIALIZING SENTINEL SOC…</p>
    </div>
  )
}


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<Protected><LogUpload /></Protected>} />
      <Route path="/incidents/:id" element={<Protected><IncidentDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

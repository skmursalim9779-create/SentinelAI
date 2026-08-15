import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName, orgName)
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ink-950 px-4">
        <div className="text-center max-w-sm">
          <p className="text-signal text-sm font-mono mb-2">✓ account created</p>
          <h2 className="text-lg font-display mb-2">Check your inbox</h2>
          <p className="text-sm text-ink-400 mb-6">
            Confirm your email, then sign in to reach your dashboard.
          </p>
          <Link to="/login" className="text-signal text-sm hover:text-signal-glow">
            Go to sign in →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-ink-950 scanline-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-2 h-2 rounded-full bg-signal shadow-glow" />
          <h1 className="text-xl font-display font-semibold">SentinelAI</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-ink-700 bg-ink-900">
          <div>
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-800 border border-ink-600 text-ink-100 text-sm focus:border-signal outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">Organization</label>
            <input
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-800 border border-ink-600 text-ink-100 text-sm focus:border-signal outline-none"
              placeholder="Acme Security Team"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-800 border border-ink-600 text-ink-100 text-sm focus:border-signal outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-800 border border-ink-600 text-ink-100 text-sm focus:border-signal outline-none"
            />
          </div>

          {error && <p className="text-xs text-threat-critical">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-signal text-ink-950 font-medium text-sm hover:bg-signal-glow transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-signal hover:text-signal-glow">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

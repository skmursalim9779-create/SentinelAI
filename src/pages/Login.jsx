import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
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
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-800 border border-ink-600 text-ink-100 text-sm focus:border-signal outline-none"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-800 border border-ink-600 text-ink-100 text-sm focus:border-signal outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-threat-critical">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-signal text-ink-950 font-medium text-sm hover:bg-signal-glow transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-400 mt-4">
          No account?{' '}
          <Link to="/signup" className="text-signal hover:text-signal-glow">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowRight, HelpCircle, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import CyberBackground from '../components/CyberBackground.jsx'
import GoogleIcon from '../components/GoogleIcon.jsx'
import GoogleOAuthModal from '../components/GoogleOAuthModal.jsx'

export default function Login() {
  const { session, signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showOAuthModal, setShowOAuthModal] = useState(false)

  // Redirect if already logged in or after OAuth callback
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  // Parse OAuth redirect errors from URL hash or query params
  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    let errDesc = params.get('error_description') || params.get('error')

    if (!errDesc && hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      errDesc = hashParams.get('error_description') || hashParams.get('error')
    }

    if (errDesc) {
      const decodedErr = decodeURIComponent(errDesc.replace(/\+/g, ' '))
      setError(decodedErr)
      if (decodedErr.toLowerCase().includes('provider') || decodedErr.toLowerCase().includes('unsupported')) {
        setShowOAuthModal(true)
      }
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const { data, error: err } = await signIn(email, password)

    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    // Block unverified email/password users
    const user = data?.user
    if (
      user &&
      !user.email_confirmed_at &&
      user.app_metadata?.provider === 'email'
    ) {
      await supabase.auth.signOut()
      setError('Please verify your email address before signing in.')
      return
    }

    navigate('/')
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)

    try {
      const { error: oAuthErr } = await signInWithGoogle()

      if (oAuthErr) {
        setError(oAuthErr.message)
        setGoogleLoading(false)
        setShowOAuthModal(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to Google OAuth')
      setGoogleLoading(false)
      setShowOAuthModal(true)
    }
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 py-8 relative overflow-x-hidden">
      <CyberBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-signal shadow-glow" />
              <span className="w-3 h-3 rounded-full bg-signal absolute animate-ping opacity-60" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-ink-100">
              SentinelAI
            </h1>
          </div>
          <p className="text-xs font-mono text-ink-400">SOC incident response platform</p>
        </div>

        {/* Login Form Card */}
        <motion.div
          layout
          className="p-7 rounded-2xl border border-ink-700/80 bg-ink-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-signal to-transparent opacity-80" />

          <div className="mb-5">
            <h2 className="text-lg font-display font-semibold text-ink-100">Sign in to console</h2>
            <p className="text-xs text-ink-400 mt-0.5">Enter your analyst credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                placeholder="analyst@sentinel.ai"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-9 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end pt-0.5">
              <Link
                to="/forgot-password"
                className="text-xs text-signal hover:text-signal-glow font-mono transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Success Message */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-threat-low/10 border border-threat-low/30 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 size={15} className="text-threat-low shrink-0" />
                  <p className="text-threat-low font-mono flex-1 leading-relaxed">
                    {successMessage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message with Help Trigger */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-threat-critical/10 border border-threat-critical/30 text-xs flex items-start justify-between gap-2"
                >
                  <p className="text-threat-critical font-mono flex-1 leading-relaxed">
                    {error}
                  </p>
                  {(error.toLowerCase().includes('provider') || error.toLowerCase().includes('google') || error.toLowerCase().includes('oauth')) && (
                    <button
                      type="button"
                      onClick={() => setShowOAuthModal(true)}
                      className="text-signal hover:text-signal-glow font-mono underline shrink-0 flex items-center gap-1 text-[11px]"
                    >
                      <HelpCircle size={13} /> Fix Guide
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 rounded-lg bg-signal text-ink-950 font-semibold text-sm hover:bg-signal-glow transition-all duration-200 shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-ink-800" />
              <span className="text-[11px] text-ink-500 font-mono uppercase tracking-wider">
                OR
              </span>
              <div className="flex-1 h-px bg-ink-800" />
            </div>

            {/* Google Sign In */}
            <motion.button
              whileHover={{ scale: 1.01, borderColor: '#4A5568' }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-2.5 rounded-lg border border-ink-700 bg-ink-800/80 hover:bg-ink-800 text-ink-100 font-medium text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer shadow-sm group"
            >
              {googleLoading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-signal border-t-transparent animate-spin" />
                  <span className="font-mono text-xs">Authorizing with Google…</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Signup Link */}
        <p className="text-center text-xs text-ink-400 mt-5">
          Don't have an account yet?{' '}
          <Link
            to="/signup"
            className="text-signal hover:text-signal-glow font-medium transition-colors underline-offset-2 hover:underline"
          >
            Create one here →
          </Link>
        </p>
      </motion.div>

      {/* Google OAuth Setup Diagnostic Modal */}
      <GoogleOAuthModal
        isOpen={showOAuthModal}
        onClose={() => setShowOAuthModal(false)}
        errorMessage={error}
      />
    </div>
  )
}

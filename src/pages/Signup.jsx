import { useState, useEffect } from 'react'
import { Eye, EyeOff, Shield, ArrowRight, HelpCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import CyberBackground from '../components/CyberBackground.jsx'
import GoogleIcon from '../components/GoogleIcon.jsx'
import GoogleOAuthModal from '../components/GoogleOAuthModal.jsx'

export default function Signup() {
  const { session, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [done, setDone] = useState(false)
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

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: err } = await signUp(
      email,
      password,
      fullName,
      orgName
    )

    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setDone(true)
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF7A3D', '#4A9BFF', '#4ADE80', '#FFA36C']
        })
      } catch {
        // Confetti fallback
      }
    }
  }

  async function handleGoogleSignUp() {
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

  if (done) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 relative overflow-hidden">
        <CyberBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-sm w-full p-8 rounded-2xl bg-ink-900/90 backdrop-blur-xl border border-ink-700 shadow-2xl relative z-10"
        >
          <div className="w-14 h-14 rounded-2xl bg-threat-low/15 border border-threat-low/30 text-threat-low flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 size={28} />
          </div>

          <p className="text-signal text-xs font-mono uppercase tracking-widest mb-1">
            ✓ Account Created Successfully
          </p>

          <h2 className="text-xl font-display font-semibold text-ink-100 mb-2">
            Check your inbox
          </h2>

          <p className="text-sm text-ink-400 mb-6">
            We sent a confirmation link to <span className="text-ink-200 font-mono">{email}</span>. Confirm your email, then sign in.
          </p>

          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-signal text-ink-950 font-medium text-sm hover:bg-signal-glow transition-all duration-200 shadow-glow"
          >
            <span>Go to sign in</span>
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 py-8 relative overflow-x-hidden">
      <CyberBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
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
          <p className="text-xs font-mono text-ink-400">Next-gen agentic SOC & incident copilot</p>
        </div>

        {/* Signup Container Card */}
        <motion.div
          layout
          className="p-7 rounded-2xl border border-ink-700/80 bg-ink-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-signal to-transparent opacity-80" />

          <div className="mb-5">
            <h2 className="text-lg font-display font-semibold text-ink-100">Create your account</h2>
            <p className="text-xs text-ink-400 mt-0.5">Start monitoring threats with autonomous AI agents</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name & Organization in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                  placeholder="CyberSec Corp"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                Work email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                placeholder="analyst@enterprise.com"
              />
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
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

              <div>
                <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 transition-colors p-0.5"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

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

            {/* Create Account Button */}
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
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
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

            {/* Google Signup */}
            <motion.button
              whileHover={{ scale: 1.01, borderColor: '#4A5568' }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGoogleSignUp}
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
                  <span>Sign up with Google</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Login Link */}
        <p className="text-center text-xs text-ink-400 mt-5">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-signal hover:text-signal-glow font-medium transition-colors underline-offset-2 hover:underline"
          >
            Sign in here →
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

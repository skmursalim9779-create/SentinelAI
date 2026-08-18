import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowRight, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import CyberBackground from '../components/CyberBackground.jsx'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  // --------------------------------------------------
  // CHECK PASSWORD RECOVERY SESSION
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true

    async function checkSession() {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Session error:', error)
          setError(error.message)
          setCheckingSession(false)
          return
        }

        if (session) {
          setHasRecoverySession(true)
        } else {
          setHasRecoverySession(false)
        }

        setCheckingSession(false)
      } catch (err) {
        if (!mounted) return

        console.error('Session check failed:', err)
        setError(err.message || 'Unable to verify reset session.')
        setCheckingSession(false)
      }
    }

    checkSession()

    // Supabase fires PASSWORD_RECOVERY when the
    // password reset link creates the recovery session.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      console.log('Auth event:', event)

      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasRecoverySession(true)
        setCheckingSession(false)
        setError('')
        setInfoMessage('Reset link verified. You can now create a new password.')
      }

      if (event === 'SIGNED_IN' && session) {
        setHasRecoverySession(true)
        setCheckingSession(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // UPDATE PASSWORD
  // --------------------------------------------------
  async function handleUpdatePassword(e) {
    e.preventDefault()

    setError('')
    setInfoMessage('')

    if (!hasRecoverySession) {
      setError(
        'Your password reset session is missing or expired. Please request a new reset link.'
      )
      return
    }

    if (!newPassword) {
      setError('Please enter a new password.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error: updateErr } = await updatePassword(newPassword)

      if (updateErr) {
        setLoading(false)
        setError(updateErr.message)
        return
      }

      setLoading(false)

      setInfoMessage(
        'Password updated successfully. Redirecting to sign in...'
      )

      // Give the user a moment to see the success message.
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Password updated successfully. Please sign in.'
          },
          replace: true
        })
      }, 1200)
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Failed to update password.')
    }
  }

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------
  if (checkingSession) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 relative overflow-hidden">
        <CyberBackground />

        <div className="relative z-10 flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin" />

          <p className="text-xs font-mono text-ink-400">
            Verifying password reset link...
          </p>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // INVALID / EXPIRED RESET LINK
  // --------------------------------------------------
  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 py-8 relative overflow-hidden">
        <CyberBackground />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Brand */}
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

            <p className="text-xs font-mono text-ink-400">
              SOC incident response platform
            </p>
          </div>

          {/* Card */}
          <div className="p-7 rounded-2xl border border-ink-700/80 bg-ink-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-signal to-transparent opacity-80" />

            <div className="mb-5">
              <h2 className="text-lg font-display font-semibold text-ink-100">
                Reset link invalid
              </h2>

              <p className="text-xs text-ink-400 mt-1 leading-relaxed">
                This password reset link is invalid, expired, or has already
                been used.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-threat-critical/10 border border-threat-critical/30 text-xs text-threat-critical font-mono leading-relaxed mb-4">
              Please request a new password reset link.
            </div>

            <Link
              to="/forgot-password"
              className="w-full py-2.5 rounded-lg bg-signal text-ink-950 font-semibold text-sm hover:bg-signal-glow transition-all duration-200 shadow-glow flex items-center justify-center gap-2"
            >
              <span>Request New Link</span>
              <ArrowRight size={15} />
            </Link>

            <div className="mt-5 pt-4 border-t border-ink-800 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100 transition-colors font-mono"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // --------------------------------------------------
  // NORMAL RESET PASSWORD SCREEN
  // --------------------------------------------------
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

          <p className="text-xs font-mono text-ink-400">
            SOC incident response platform
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          layout
          className="p-7 rounded-2xl border border-ink-700/80 bg-ink-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          {/* Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-signal to-transparent opacity-80" />

          <div className="mb-5">
            <h2 className="text-lg font-display font-semibold text-ink-100">
              Set new password
            </h2>

            <p className="text-xs text-ink-400 mt-0.5">
              Create a new secure password for your SentinelAI account.
            </p>
          </div>

          {/* Recovery confirmation */}
          <div className="mb-4 px-3 py-2 rounded-lg bg-threat-low/10 border border-threat-low/30 text-xs flex items-center gap-2">
            <CheckCircle2
              size={15}
              className="text-threat-low shrink-0"
            />

            <p className="text-threat-low font-mono leading-relaxed">
              Password reset link verified.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                New password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                  placeholder="••••••••"
                />

                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 transition-colors p-0.5"
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                Confirm new password
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                  placeholder="••••••••"
                />

                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 transition-colors p-0.5"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-threat-critical/10 border border-threat-critical/30 text-xs text-threat-critical font-mono leading-relaxed"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success / Info */}
            <AnimatePresence>
              {infoMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-threat-low/10 border border-threat-low/30 text-xs flex items-center gap-2"
                >
                  <CheckCircle2
                    size={15}
                    className="text-threat-low shrink-0"
                  />

                  <p className="text-threat-low font-mono flex-1 leading-relaxed">
                    {infoMessage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Update Password */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-signal text-ink-950 font-semibold text-sm hover:bg-signal-glow transition-all duration-200 shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                  <span>Updating password…</span>
                </>
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>

          {/* Back to Login */}
          <div className="mt-5 pt-4 border-t border-ink-800 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100 transition-colors font-mono"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
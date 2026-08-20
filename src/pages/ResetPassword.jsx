import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient.js'
import CyberBackground from '../components/CyberBackground.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword, signOut } = useAuth()

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  // --------------------------------------------------
  // CHECK FOR SUPABASE PASSWORD-RECOVERY SESSION
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true

    async function checkRecoverySession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          setError(sessionError.message)
          setCheckingSession(false)
          return
        }

        if (session) {
          setHasRecoverySession(true)
          setInfoMessage(
            'Your password reset link has been verified. You can now create a new password.'
          )
        } else {
          setHasRecoverySession(false)
        }

        setCheckingSession(false)
      } catch (err) {
        if (!mounted) return

        setError(err.message || 'Unable to verify the password reset session.')
        setCheckingSession(false)
      }
    }

    checkRecoverySession()

    // Supabase emits PASSWORD_RECOVERY after a valid recovery link
    // creates the recovery session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasRecoverySession(true)
        setCheckingSession(false)
        setError('')
        setInfoMessage(
          'Your password reset link has been verified. You can now create a new password.'
        )
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
        'Your password reset session is missing or expired. Please request a new reset email.'
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
      const { error: updateError } = updatePassword
        ? await updatePassword(newPassword)
        : await supabase.auth.updateUser({
            password: newPassword,
          })

      if (updateError) {
        setLoading(false)
        setError(updateError.message)
        return
      }

      setInfoMessage(
        'Password updated successfully. Redirecting to sign in...'
      )

      // End the recovery session before returning to login.
      try {
        if (signOut) {
          await signOut()
        } else {
          await supabase.auth.signOut()
        }
      } catch {
        // Password was already updated, so sign-out failure should
        // not prevent the user from reaching the login page.
      }

      setTimeout(() => {
        navigate('/login', {
          state: {
            message:
              'Password updated successfully. Please sign in with your new password.',
          },
          replace: true,
        })
      }, 1000)
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Failed to update password.')
    }
  }

  // --------------------------------------------------
  // LOADING
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
  // INVALID / EXPIRED SESSION
  // --------------------------------------------------
  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 py-8 relative overflow-hidden">
        <CyberBackground />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm relative z-10"
        >
          <motion.div className="p-7 rounded-2xl border border-ink-700/80 bg-ink-900/90 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-display font-bold tracking-tight text-ink-100 mb-2">
                SentinelAI
              </h1>

              <p className="text-xs font-mono text-ink-400 mb-6">
                SOC incident response platform
              </p>

              <h2 className="text-lg font-display font-semibold text-ink-100 mb-2">
                Reset link unavailable
              </h2>

              <p className="text-xs text-ink-400 leading-relaxed mb-5">
                This password reset link is invalid or has expired. Please
                request a new password reset email.
              </p>

              {error && (
                <div className="w-full mb-4 p-3 rounded-lg bg-threat-critical/10 border border-threat-critical/30">
                  <p className="text-xs text-threat-critical font-mono leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <Link
                to="/forgot-password"
                className="w-full py-2.5 rounded-lg bg-signal text-ink-950 font-semibold text-sm hover:bg-signal-glow transition-all duration-200 shadow-glow flex items-center justify-center gap-2"
              >
                Request New Reset Email
              </Link>

              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100 transition-colors font-mono"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // --------------------------------------------------
  // PASSWORD RESET FORM
  // --------------------------------------------------
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 py-8 relative overflow-hidden">
      <CyberBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
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

        <motion.div
          layout
          className="p-7 rounded-2xl border border-ink-700/80 bg-ink-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-signal to-transparent opacity-80" />

          <div className="mb-5">
            <h2 className="text-lg font-display font-semibold text-ink-100">
              Create new password
            </h2>

            <p className="text-xs text-ink-400 mt-1">
              Choose a new password for your SentinelAI account.
            </p>
          </div>

          <div className="mb-5 px-3 py-2 rounded-lg bg-threat-low/10 border border-threat-low/30 flex items-center gap-2">
            <CheckCircle2
              size={15}
              className="text-threat-low shrink-0"
            />

            <p className="text-xs text-threat-low font-mono">
              Password reset link verified.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* New password */}
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
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
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

            {/* Confirm password */}
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
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
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
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </motion.button>
          </form>

          <div className="mt-5 pt-4 border-t border-ink-800 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100 transition-colors font-mono"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
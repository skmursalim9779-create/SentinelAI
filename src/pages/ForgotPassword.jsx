import { useState } from 'react'
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import CyberBackground from '../components/CyberBackground.jsx'

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setSent(false)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await sendPasswordReset(email.trim())

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setLoading(false)
      setSent(true)
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Failed to send password reset email.')
    }
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-ink-950 px-4 py-8 relative overflow-hidden">
      <CyberBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
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

          {!sent ? (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-display font-semibold text-ink-100">
                  Forgot password?
                </h2>

                <p className="text-xs text-ink-400 mt-1 leading-relaxed">
                  Enter your registered email address and we'll send you a
                  password reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
                    Email address
                  </label>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@sentinel.ai"
                    className="w-full px-3 py-2 rounded-lg bg-ink-800/90 border border-ink-650 text-ink-100 text-sm focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all placeholder:text-ink-500"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-lg bg-threat-critical/10 border border-threat-critical/30"
                    >
                      <p className="text-threat-critical text-xs font-mono">
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-signal text-ink-950 font-semibold text-sm hover:bg-signal-glow transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                      Sending reset email...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight size={15} />
                    </>
                  )}
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <CheckCircle2
                size={32}
                className="text-threat-low mx-auto mb-4"
              />

              <h2 className="text-lg font-display font-semibold text-ink-100">
                Check your email
              </h2>

              <p className="text-xs text-ink-400 mt-2 leading-relaxed">
                We sent a password reset link to:
              </p>

              <p className="text-sm text-ink-200 font-mono mt-2 break-all">
                {email}
              </p>

              <p className="text-xs text-ink-400 mt-4 leading-relaxed">
                Open the email and click the reset link to create a new
                password.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSent(false)
                  setError('')
                }}
                className="mt-5 text-xs text-signal hover:text-signal-glow font-mono transition-colors"
              >
                Send again
              </button>
            </motion.div>
          )}

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
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Copy, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function GoogleOAuthModal({ isOpen, onClose, errorMessage }) {
  const [copied, setCopied] = useState(false)
  const callbackUrl = 'https://bestbzrzteunjzsjvhpo.supabase.co/auth/v1/callback'
  const supabaseDashboardUrl = 'https://supabase.com/dashboard/project/bestbzrzteunjzsjvhpo/auth/providers'

  function handleCopy() {
    navigator.clipboard.writeText(callbackUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
          className="relative w-full max-w-lg bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl overflow-hidden p-6 z-10 text-ink-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-ink-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-signal/15 border border-signal/30 flex items-center justify-center text-signal">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-display font-semibold text-ink-100">
                  Google OAuth Configuration Needed
                </h3>
                <p className="text-xs text-ink-400 font-mono">
                  Supabase Auth Provider Status
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Error explanation banner */}
          <div className="mt-4 p-3 rounded-lg bg-threat-critical/10 border border-threat-critical/30 flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-threat-critical mt-1.5 shrink-0 animate-pulse" />
            <div className="text-xs">
              <p className="text-threat-critical font-medium font-mono">
                {errorMessage || 'Unsupported provider: provider is not enabled'}
              </p>
              <p className="text-ink-300 mt-1">
                Google OAuth is currently disabled in your Supabase project settings. Follow the 3 quick steps below to enable it.
              </p>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="mt-5 space-y-3">
            <div className="flex gap-3 text-xs bg-ink-800/60 p-3 rounded-xl border border-ink-700/60">
              <span className="w-5 h-5 rounded-full bg-ink-700 text-signal font-mono font-semibold flex items-center justify-center shrink-0">
                1
              </span>
              <div className="flex-1">
                <p className="font-medium text-ink-100 mb-1">Open Supabase Auth Providers</p>
                <p className="text-ink-400 mb-2">Navigate to your project's Auth Providers dashboard and click on <strong>Google</strong>.</p>
                <a
                  href={supabaseDashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-signal hover:text-signal-glow font-mono underline"
                >
                  Open Supabase Providers Dashboard <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="flex gap-3 text-xs bg-ink-800/60 p-3 rounded-xl border border-ink-700/60">
              <span className="w-5 h-5 rounded-full bg-ink-700 text-signal font-mono font-semibold flex items-center justify-center shrink-0">
                2
              </span>
              <div className="flex-1">
                <p className="font-medium text-ink-100 mb-1">Copy Authorized Redirect Callback URI</p>
                <p className="text-ink-400 mb-2">Paste this URL into your Google Cloud Console credentials under <em>Authorized redirect URIs</em>:</p>
                <div className="flex items-center gap-2 bg-ink-950 p-2 rounded-lg border border-ink-700 font-mono text-[11px] text-ink-300 select-all">
                  <span className="truncate flex-1">{callbackUrl}</span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded bg-ink-800 hover:bg-ink-700 text-ink-200 transition-colors flex items-center gap-1 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-threat-low" />
                        <span className="text-[10px] text-threat-low">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 text-xs bg-ink-800/60 p-3 rounded-xl border border-ink-700/60">
              <span className="w-5 h-5 rounded-full bg-ink-700 text-signal font-mono font-semibold flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <p className="font-medium text-ink-100 mb-0.5">Toggle "Enable Google provider" & Save</p>
                <p className="text-ink-400">Enter your Google Client ID and Secret in Supabase, then click Save.</p>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="mt-4 p-2.5 rounded-lg bg-ink-950/60 border border-ink-800 flex items-center gap-2 text-[11px] text-ink-400 font-mono">
            <ShieldCheck size={14} className="text-signal shrink-0" />
            <span>You can also sign up or sign in instantly with Email & Password above.</span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-ink-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-700 text-xs font-medium transition-colors"
            >
              Got it, close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

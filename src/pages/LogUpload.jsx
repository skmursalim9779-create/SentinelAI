import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import Sidebar from '../components/Sidebar.jsx'

const SAMPLE_LOG = `2026-08-12T02:14:03Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:05Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:07Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:09Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:11Z auth-service [INFO] login success user=admin ip=185.220.101.42
2026-08-12T02:14:22Z api-gateway [INFO] admin session created, scope=full_access
2026-08-12T02:15:03Z db-service [WARN] bulk export requested table=customers rows=48213 by=admin`

export default function LogUpload() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [sourceName, setSourceName] = useState('manual-paste')
  const [status, setStatus] = useState('idle') // idle | uploading | analyzing | done | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setStatus('uploading')
    setError('')
    setResult(null)

    try {
      const { data: rawLog, error: insertErr } = await supabase
        .from('raw_logs')
        .insert({
          org_id: profile.org_id,
          content,
          uploaded_by: profile.id
        })
        .select()
        .single()
      if (insertErr) throw insertErr

      setStatus('analyzing')
      const { data: fnResult, error: fnErr } = await supabase.functions.invoke('agent-pipeline', {
        body: { raw_log_id: rawLog.id }
      })
      if (fnErr) throw fnErr

      setResult(fnResult)
      setStatus('done')

      if (fnResult?.status === 'incident_created') {
        setTimeout(() => navigate(`/incidents/${fnResult.incident_id}`), 1200)
      }
    } catch (err) {
      setError(err.message || String(err))
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <h2 className="text-2xl font-display font-semibold mb-1">Ingest logs</h2>
        <p className="text-sm text-ink-400 mb-8">
          Paste raw log lines. The agent pipeline parses, classifies, investigates, and
          reports — automatically, in one pass.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">
              Source name
            </label>
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-ink-900 border border-ink-700 text-sm focus:border-signal outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-mono text-ink-400 uppercase tracking-wide">
                Raw log content
              </label>
              <button
                type="button"
                onClick={() => setContent(SAMPLE_LOG)}
                className="text-xs text-signal hover:text-signal-glow"
              >
                Use sample log
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Paste log lines here…"
              className="w-full px-3 py-3 rounded-lg bg-ink-900 border border-ink-700 text-sm font-mono focus:border-signal outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'uploading' || status === 'analyzing'}
            className="w-full py-3 rounded-lg bg-signal text-ink-950 font-medium text-sm hover:bg-signal-glow transition-colors disabled:opacity-60"
          >
            {status === 'uploading' && 'Uploading…'}
            {status === 'analyzing' && 'Agents analyzing… (parsing → classifying → investigating → reporting)'}
            {(status === 'idle' || status === 'done' || status === 'error') && 'Run agent pipeline'}
          </button>
        </form>

        {status === 'error' && (
          <p className="mt-4 text-sm text-threat-critical">{error}</p>
        )}

        {status === 'done' && result?.status === 'no_incident' && (
          <div className="mt-6 p-4 rounded-xl border border-threat-low/30 bg-threat-low/10">
            <p className="text-sm text-threat-low">
              No incident detected — the classifier agent found nothing anomalous in this log.
            </p>
          </div>
        )}

        {status === 'done' && result?.status === 'incident_created' && (
          <div className="mt-6 p-4 rounded-xl border border-signal/30 bg-signal/10">
            <p className="text-sm text-signal">Incident created — redirecting to report…</p>
          </div>
        )}
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient.js'
import { fetchIncidentDetails, updateIncidentStatus } from '../lib/incidentStore.js'
import Sidebar from '../components/Sidebar.jsx'
import SeverityRing, { SeverityLabel } from '../components/SeverityRing.jsx'
import CyberBackground from '../components/CyberBackground.jsx'
import { ArrowLeft, Clock, Copy, Check, Shield, FileText, CheckCircle2 } from 'lucide-react'

const STATUSES = ['open', 'investigating', 'resolved', 'false_positive']

export default function IncidentDetail() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  async function load() {
    setLoading(true)
    const { incident: inc, timeline: tl, report: rep } = await fetchIncidentDetails(id)
    setIncident(inc)
    setTimeline(tl || [])
    setReport(rep || null)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`incident-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  async function updateStatus(status) {
    setStatusUpdating(true)
    await updateIncidentStatus(id, status)
    setIncident((prev) => ({ ...prev, status }))
    setStatusUpdating(false)
  }

  function handleCopyReport() {
    if (!report?.output_markdown) return
    navigator.clipboard.writeText(report.output_markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !incident) {
    return (
      <div className="flex min-h-screen bg-ink-950 text-ink-100 relative">
        <CyberBackground />
        <Sidebar />
        <main className="flex-1 px-8 py-8 flex items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-ink-400">Loading incident investigation…</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-100 relative">
      <CyberBackground />
      <Sidebar />

      <main className="flex-1 px-8 py-8 max-w-4xl relative z-10">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-ink-400 hover:text-signal transition-colors mb-6 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to incident feed</span>
        </Link>

        {/* Incident Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="p-6 rounded-2xl border border-ink-800 bg-ink-900/90 backdrop-blur-xl mb-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex items-start gap-5">
            <SeverityRing severity={incident.severity} size={56} />

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold text-ink-100 mb-2 leading-snug">
                {incident.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <SeverityLabel severity={incident.severity} />

                {incident.mitre_tactic && (
                  <span className="font-mono text-ink-300 bg-ink-800 px-2.5 py-0.5 rounded-lg border border-ink-700">
                    {incident.mitre_tactic} / {incident.mitre_technique}
                  </span>
                )}

                <span className="text-ink-500 font-mono text-[11px] flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(incident.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Status Switcher with Sliding Pill */}
          <div className="mt-6 pt-5 border-t border-ink-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-mono text-ink-400 uppercase tracking-wider">
              Triage Status:
            </span>

            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-ink-950/80 rounded-xl border border-ink-800">
              {STATUSES.map((s) => {
                const isSelected = incident.status === s
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={statusUpdating}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors z-10 ${
                      isSelected
                        ? 'text-ink-950 font-bold'
                        : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="status-pill"
                        className="absolute inset-0 bg-signal rounded-lg -z-10 shadow-glow"
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      />
                    )}
                    {s.replace('_', ' ')}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Correlated Event Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-signal" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-400">
              Correlated Event Timeline
            </h3>
          </div>

          {timeline.length === 0 ? (
            <div className="p-5 rounded-xl border border-dashed border-ink-800 bg-ink-900/30 text-center">
              <p className="text-xs font-mono text-ink-500">No correlated events recorded in stream.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-ink-800">
              {timeline.map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="relative group"
                >
                  {/* Pulse Dot */}
                  <span className="absolute -left-[27px] top-2 w-3 h-3 rounded-full bg-signal border-2 border-ink-950 shadow-glow" />

                  <div className="p-4 rounded-xl border border-ink-800 bg-ink-900/70 hover:border-ink-700 hover:bg-ink-850 transition-colors">
                    <p className="text-xs text-ink-100 font-medium leading-relaxed">{event.description}</p>
                    <p className="text-[11px] text-ink-400 font-mono mt-1 flex items-center gap-2">
                      <span>{event.event_time ? new Date(event.event_time).toLocaleString() : 'time unknown'}</span>
                      {event.source && <span className="text-signal/80">• {event.source}</span>}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* AI Agent Deep Report */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-signal" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-ink-400">
                Agent Synthesis & Remediation Report
              </h3>
            </div>

            {report && (
              <button
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-900 border border-ink-700 hover:border-signal/40 text-ink-300 hover:text-signal text-xs font-mono transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-threat-low" />
                    <span className="text-threat-low">Copied Report</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            )}
          </div>

          {report ? (
            <div className="p-6 rounded-2xl border border-ink-800 bg-ink-900/90 backdrop-blur-xl shadow-xl prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-body text-ink-200 leading-relaxed border-l-4 border-l-signal">
              {report.output_markdown}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-ink-800 bg-ink-900/30 text-center">
              <p className="text-xs font-mono text-ink-500">Autonomous report agent synthesis pending.</p>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import Sidebar from '../components/Sidebar.jsx'
import SeverityRing, { SeverityLabel } from '../components/SeverityRing.jsx'

export default function IncidentDetail() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: inc }, { data: tl }, { data: reports }] = await Promise.all([
      supabase.from('incidents').select('*').eq('id', id).single(),
      supabase.from('incident_timeline').select('*').eq('incident_id', id).order('event_time'),
      supabase
        .from('agent_reports')
        .select('*')
        .eq('incident_id', id)
        .eq('agent_name', 'report_writer')
        .order('created_at', { ascending: false })
        .limit(1)
    ])
    setIncident(inc)
    setTimeline(tl || [])
    setReport(reports?.[0] || null)
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
    await supabase.from('incidents').update({ status }).eq('id', id)
    load()
  }

  if (loading || !incident) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 px-8 py-8">
          <p className="text-sm text-ink-400">Loading…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <Link to="/" className="text-xs text-ink-400 hover:text-signal mb-4 inline-block">
          ← Back to incidents
        </Link>

        <div className="flex items-start gap-4 mb-6">
          <SeverityRing severity={incident.severity} size={56} />
          <div className="flex-1">
            <h2 className="text-xl font-display font-semibold mb-1">{incident.title}</h2>
            <div className="flex items-center gap-3">
              <SeverityLabel severity={incident.severity} />
              {incident.mitre_tactic && (
                <span className="text-xs font-mono text-ink-400">
                  {incident.mitre_tactic} / {incident.mitre_technique}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {['open', 'investigating', 'resolved', 'false_positive'].map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide border transition-colors ${
                incident.status === s
                  ? 'border-signal text-signal bg-signal/10'
                  : 'border-ink-700 text-ink-400 hover:border-ink-500'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <section className="mb-8">
          <h3 className="text-sm font-mono uppercase tracking-wide text-ink-400 mb-3">Timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-ink-500">No correlated events recorded.</p>
          ) : (
            <ol className="space-y-3 border-l border-ink-700 pl-4">
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-signal" />
                  <p className="text-sm text-ink-100">{event.description}</p>
                  <p className="text-xs text-ink-500 font-mono mt-0.5">
                    {event.event_time ? new Date(event.event_time).toLocaleString() : 'time unknown'}
                    {event.source && ` · ${event.source}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wide text-ink-400 mb-3">
            Agent report
          </h3>
          {report ? (
            <div className="p-5 rounded-xl border border-ink-700 bg-ink-900 prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-body text-ink-200">
              {report.output_markdown}
            </div>
          ) : (
            <p className="text-sm text-ink-500">Report agent hasn't produced output yet.</p>
          )}
        </section>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import Sidebar from '../components/Sidebar.jsx'
import StatCard from '../components/StatCard.jsx'
import IncidentCard from '../components/IncidentCard.jsx'

export default function Dashboard() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
    setIncidents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('incidents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const filtered = incidents.filter((i) => filter === 'all' || i.severity === filter)
  const counts = {
    critical: incidents.filter((i) => i.severity === 'critical').length,
    high: incidents.filter((i) => i.severity === 'high').length,
    open: incidents.filter((i) => i.status === 'open').length,
    total: incidents.length
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-semibold">Incidents</h2>
            <p className="text-sm text-ink-400 mt-1">Live feed, triaged by the agent pipeline</p>
          </div>
          <Link
            to="/upload"
            className="px-4 py-2 rounded-lg bg-signal text-ink-950 text-sm font-medium hover:bg-signal-glow transition-colors"
          >
            + Ingest logs
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Total incidents" value={counts.total} accent="#A8B2C0" />
          <StatCard label="Critical" value={counts.critical} accent="#FF4D5E" />
          <StatCard label="High" value={counts.high} accent="#FF7A3D" />
          <StatCard label="Open" value={counts.open} accent="#F2C94C" />
        </div>

        <div className="flex gap-2 mb-4">
          {['all', 'critical', 'high', 'medium', 'low', 'info'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wide border transition-colors ${
                filter === s
                  ? 'border-signal text-signal bg-signal/10'
                  : 'border-ink-700 text-ink-400 hover:border-ink-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-ink-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-ink-700">
            <p className="text-ink-300 mb-1">No incidents yet</p>
            <p className="text-sm text-ink-500 mb-4">
              Ingest a log to let the agent pipeline analyze it.
            </p>
            <Link to="/upload" className="text-signal text-sm hover:text-signal-glow">
              Ingest your first log →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

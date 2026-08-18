import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient.js'
import { fetchAllIncidents } from '../lib/incidentStore.js'
import Sidebar from '../components/Sidebar.jsx'
import StatCard from '../components/StatCard.jsx'
import IncidentCard from '../components/IncidentCard.jsx'
import CyberBackground from '../components/CyberBackground.jsx'
import { ShieldAlert, Plus, RefreshCw, Activity, Layers } from 'lucide-react'

export default function Dashboard() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')
  const [time, setTime] = useState(new Date().toUTCString().slice(17, 25) + ' UTC')

  async function load() {
    setRefreshing(true)
    const data = await fetchAllIncidents()
    setIncidents(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('incidents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, load)
      .subscribe()

    const clockTimer = setInterval(() => {
      setTime(new Date().toUTCString().slice(17, 25) + ' UTC')
    }, 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(clockTimer)
    }
  }, [])

  const filtered = incidents.filter((i) => filter === 'all' || i.severity === filter)
  const counts = {
    critical: incidents.filter((i) => i.severity === 'critical').length,
    high: incidents.filter((i) => i.severity === 'high').length,
    open: incidents.filter((i) => i.status === 'open').length,
    total: incidents.length
  }

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
    { key: 'info', label: 'Info' }
  ]

  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-100 relative">
      <CyberBackground />
      <Sidebar />

      <main className="flex-1 px-8 py-8 max-w-5xl relative z-10">
        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-ink-800/80"
        >
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold tracking-tight text-ink-100">
                Threat Incidents
              </h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-signal/15 border border-signal/30 text-signal">
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                Live Agent Feed
              </span>
            </div>
            <p className="text-xs font-mono text-ink-400 mt-1 flex items-center gap-2">
              <span>Triaged autonomously by multi-agent pipeline</span>
              <span>•</span>
              <span className="text-ink-300">{time}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={load}
              disabled={refreshing}
              className="p-2 rounded-lg bg-ink-900 border border-ink-700 text-ink-300 hover:text-signal hover:border-signal/40 transition-colors disabled:opacity-50"
              title="Refresh incidents"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-signal' : ''} />
            </button>

            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-ink-950 text-xs font-semibold hover:bg-signal-glow transition-all duration-200 shadow-glow"
            >
              <Plus size={16} />
              <span>Ingest Raw Logs</span>
            </Link>
          </div>
        </motion.div>

        {/* Stat Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <StatCard label="Total incidents" value={counts.total} accent="#A8B2C0" />
          <StatCard label="Critical threats" value={counts.critical} accent="#FF4D5E" />
          <StatCard label="High alerts" value={counts.high} accent="#FF7A3D" />
          <StatCard label="Pending triage" value={counts.open} accent="#F2C94C" />
        </motion.div>

        {/* Filter Bar with Animated Pill Highlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-1.5 p-1 bg-ink-900/80 backdrop-blur-sm border border-ink-800 rounded-xl mb-6 overflow-x-auto"
        >
          <div className="flex items-center gap-1.5 px-2 text-xs font-mono text-ink-500">
            <Layers size={14} />
            <span className="hidden sm:inline">FILTER:</span>
          </div>

          {filterOptions.map((opt) => {
            const isSelected = filter === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors z-10 ${
                  isSelected ? 'text-ink-950 font-semibold' : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 bg-signal rounded-lg -z-10 shadow-glow"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                {opt.label}
              </button>
            )
          })}
        </motion.div>

        {/* Incidents Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-signal border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-mono text-ink-400">Loading incident pipeline feed…</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-6 rounded-2xl border border-dashed border-ink-700/80 bg-ink-900/40 backdrop-blur-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-ink-800 border border-ink-700 text-ink-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert size={24} />
            </div>
            <p className="text-ink-200 font-medium text-sm mb-1">
              {filter === 'all' ? 'No incidents triaged yet' : `No ${filter} incidents recorded`}
            </p>
            <p className="text-xs text-ink-400 max-w-sm mx-auto mb-5">
              Paste raw server, auth, or firewall logs to let the autonomous AI pipeline analyze threats.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal/15 border border-signal/30 text-signal hover:bg-signal/25 text-xs font-mono transition-colors"
            >
              <Plus size={14} /> Ingest your first log →
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  )
}


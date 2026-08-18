import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SeverityRing, { SeverityLabel } from './SeverityRing.jsx'

const STATUS_STYLES = {
  open: 'text-threat-critical border-threat-critical/30 bg-threat-critical/10 shadow-[0_0_8px_rgba(255,77,94,0.15)]',
  investigating: 'text-threat-medium border-threat-medium/30 bg-threat-medium/10 shadow-[0_0_8px_rgba(242,201,76,0.15)]',
  resolved: 'text-threat-low border-threat-low/30 bg-threat-low/10 shadow-[0_0_8px_rgba(74,222,128,0.15)]',
  false_positive: 'text-ink-400 border-ink-600 bg-ink-800'
}

export default function IncidentCard({ incident }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/incidents/${incident.id}`}
        className="flex items-center gap-4 p-4 rounded-xl border border-ink-700 bg-ink-900/90 backdrop-blur-sm hover:border-signal/50 hover:bg-ink-850 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(255,122,61,0.1)] transition-all duration-200 group"
      >
        <SeverityRing severity={incident.severity} size={44} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-ink-100 truncate group-hover:text-signal transition-colors">
              {incident.title}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <SeverityLabel severity={incident.severity} />
            {incident.mitre_technique && (
              <span className="font-mono text-ink-400 bg-ink-800/80 px-2 py-0.5 rounded text-[11px] border border-ink-700/60">
                {incident.mitre_technique}
              </span>
            )}
            <span className="text-ink-500 font-mono text-[11px]">
              {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(incident.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border font-medium ${
            STATUS_STYLES[incident.status] || STATUS_STYLES.open
          }`}
        >
          {incident.status?.replace('_', ' ')}
        </span>
      </Link>
    </motion.div>
  )
}


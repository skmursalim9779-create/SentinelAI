import { Link } from 'react-router-dom'
import SeverityRing, { SeverityLabel } from './SeverityRing.jsx'

const STATUS_STYLES = {
  open: 'text-threat-critical border-threat-critical/30 bg-threat-critical/10',
  investigating: 'text-threat-medium border-threat-medium/30 bg-threat-medium/10',
  resolved: 'text-threat-low border-threat-low/30 bg-threat-low/10',
  false_positive: 'text-ink-400 border-ink-600 bg-ink-800'
}

export default function IncidentCard({ incident }) {
  return (
    <Link
      to={`/incidents/${incident.id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-ink-700 bg-ink-900 hover:border-signal/40 hover:bg-ink-800 transition-colors group"
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
            <span className="font-mono text-ink-400">{incident.mitre_technique}</span>
          )}
          <span className="text-ink-500">
            {new Date(incident.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <span
        className={`text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full border ${
          STATUS_STYLES[incident.status] || STATUS_STYLES.open
        }`}
      >
        {incident.status?.replace('_', ' ')}
      </span>
    </Link>
  )
}

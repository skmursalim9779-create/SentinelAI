import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const navItems = [
  { to: '/', label: 'Incidents', icon: '◈' },
  { to: '/upload', label: 'Ingest Logs', icon: '⇪' }
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 border-r border-ink-700 bg-ink-900 flex flex-col">
      <div className="px-6 py-6 border-b border-ink-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-signal shadow-glow" />
          <h1 className="text-lg font-semibold tracking-tight">SentinelAI</h1>
        </div>
        <p className="text-xs text-ink-400 mt-1 font-mono">agentic soc copilot</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-ink-800 text-signal'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
              }`
            }
          >
            <span className="font-mono text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-ink-700">
        <p className="text-sm text-ink-100 truncate">{profile?.full_name || 'Analyst'}</p>
        <p className="text-xs text-ink-400 font-mono mb-3 capitalize">{profile?.role || 'analyst'}</p>
        <button
          onClick={signOut}
          className="text-xs text-ink-400 hover:text-signal transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
